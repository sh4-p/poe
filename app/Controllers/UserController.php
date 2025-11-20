<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Response;
use App\Models\User;

/**
 * User Controller
 * Handles user authentication and profile management
 */
class UserController extends BaseController
{
    private User $userModel;

    public function __construct($request)
    {
        parent::__construct($request);
        $this->userModel = new User();
    }

    /**
     * Show registration form
     */
    public function showRegister(): Response
    {
        // Redirect if already logged in
        if ($this->isAuthenticated()) {
            return $this->redirect('/dashboard');
        }

        return $this->render('user/register.twig', [
            'title' => 'Register',
            'csrf_token' => $this->generateCsrfToken()
        ]);
    }

    /**
     * Handle registration
     */
    public function register(): Response
    {
        // Validate CSRF token
        $token = $this->request->input('csrf_token');
        if (!$this->verifyCsrfToken($token)) {
            if ($this->request->expectsJson()) {
                return $this->error('Invalid CSRF token', 403);
            }
            $_SESSION['flash_error'] = 'Invalid security token';
            return $this->redirect('/register');
        }

        $username = $this->request->input('username');
        $email = $this->request->input('email');
        $password = $this->request->input('password');
        $passwordConfirm = $this->request->input('password_confirm');

        // Validate inputs
        $errors = [];

        if (empty($username)) {
            $errors['username'] = 'Username is required';
        } elseif (!$this->userModel->validateUsername($username)) {
            $errors['username'] = 'Username must be 3-50 characters, alphanumeric and underscores only';
        }

        if (empty($email)) {
            $errors['email'] = 'Email is required';
        } elseif (!$this->userModel->validateEmail($email)) {
            $errors['email'] = 'Invalid email format';
        }

        if (empty($password)) {
            $errors['password'] = 'Password is required';
        } else {
            $passwordErrors = $this->userModel->validatePassword($password);
            if (!empty($passwordErrors)) {
                $errors['password'] = implode(', ', $passwordErrors);
            }
        }

        if ($password !== $passwordConfirm) {
            $errors['password_confirm'] = 'Passwords do not match';
        }

        if (!empty($errors)) {
            if ($this->request->expectsJson()) {
                return $this->json(['success' => false, 'errors' => $errors], 400);
            }

            return $this->render('user/register.twig', [
                'title' => 'Register',
                'errors' => $errors,
                'old' => [
                    'username' => $username,
                    'email' => $email
                ],
                'csrf_token' => $this->generateCsrfToken()
            ]);
        }

        // Register user
        $userId = $this->userModel->register([
            'username' => $username,
            'email' => $email,
            'password' => $password
        ]);

        if (!$userId) {
            $error = 'Registration failed. Username or email may already be in use.';

            if ($this->request->expectsJson()) {
                return $this->error($error, 400);
            }

            return $this->render('user/register.twig', [
                'title' => 'Register',
                'errors' => ['general' => $error],
                'old' => [
                    'username' => $username,
                    'email' => $email
                ],
                'csrf_token' => $this->generateCsrfToken()
            ]);
        }

        // Auto-login after registration
        $user = $this->userModel->getSafeUser($userId);
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['user'] = $user;

        if ($this->request->expectsJson()) {
            return $this->success(['user' => $user], 'Registration successful');
        }

        $_SESSION['flash_message'] = 'Welcome to Exile Architect!';
        return $this->redirect('/dashboard');
    }

    /**
     * Show login form
     */
    public function showLogin(): Response
    {
        // Redirect if already logged in
        if ($this->isAuthenticated()) {
            return $this->redirect('/dashboard');
        }

        return $this->render('user/login.twig', [
            'title' => 'Login',
            'csrf_token' => $this->generateCsrfToken()
        ]);
    }

    /**
     * Handle login
     */
    public function login(): Response
    {
        // Validate CSRF token
        $token = $this->request->input('csrf_token');
        if (!$this->verifyCsrfToken($token)) {
            if ($this->request->expectsJson()) {
                return $this->error('Invalid CSRF token', 403);
            }
            $_SESSION['flash_error'] = 'Invalid security token';
            return $this->redirect('/login');
        }

        $email = $this->request->input('email');
        $password = $this->request->input('password');

        // Validate inputs
        if (empty($email) || empty($password)) {
            $error = 'Email and password are required';

            if ($this->request->expectsJson()) {
                return $this->error($error, 400);
            }

            return $this->render('user/login.twig', [
                'title' => 'Login',
                'errors' => ['general' => $error],
                'old' => ['email' => $email],
                'csrf_token' => $this->generateCsrfToken()
            ]);
        }

        // Authenticate
        $user = $this->userModel->login($email, $password);

        if (!$user) {
            $error = 'Invalid email or password';

            if ($this->request->expectsJson()) {
                return $this->error($error, 401);
            }

            return $this->render('user/login.twig', [
                'title' => 'Login',
                'errors' => ['general' => $error],
                'old' => ['email' => $email],
                'csrf_token' => $this->generateCsrfToken()
            ]);
        }

        // Set session
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['user'] = $user;

        if ($this->request->expectsJson()) {
            return $this->success(['user' => $user], 'Login successful');
        }

        $_SESSION['flash_message'] = 'Welcome back, ' . $user['username'] . '!';
        return $this->redirect('/dashboard');
    }

    /**
     * Handle logout
     */
    public function logout(): Response
    {
        // Clear session
        session_destroy();
        session_start();

        if ($this->request->expectsJson()) {
            return $this->success([], 'Logged out successfully');
        }

        $_SESSION['flash_message'] = 'You have been logged out';
        return $this->redirect('/');
    }

    /**
     * User dashboard
     */
    public function dashboard(): Response
    {
        // Require authentication
        $authCheck = $this->requireAuth();
        if ($authCheck) return $authCheck;

        $userId = $this->getUserId();
        $user = $this->userModel->getSafeUser($userId);
        $stats = $this->userModel->getStats($userId);

        // Get user's recent builds
        $buildModel = new \App\Models\Build();
        $recentBuilds = $buildModel->getUserBuilds($userId, 10);

        return $this->render('user/dashboard.twig', [
            'title' => 'Dashboard',
            'user' => $user,
            'stats' => $stats,
            'recent_builds' => $recentBuilds
        ]);
    }

    /**
     * User profile
     */
    public function profile(): Response
    {
        // Require authentication
        $authCheck = $this->requireAuth();
        if ($authCheck) return $authCheck;

        $userId = $this->getUserId();
        $user = $this->userModel->getSafeUser($userId);

        return $this->render('user/profile.twig', [
            'title' => 'Profile',
            'user' => $user,
            'csrf_token' => $this->generateCsrfToken()
        ]);
    }

    /**
     * Update profile
     */
    public function updateProfile(): Response
    {
        // Require authentication
        $authCheck = $this->requireAuth();
        if ($authCheck) return $authCheck;

        // Validate CSRF token
        $token = $this->request->input('csrf_token');
        if (!$this->verifyCsrfToken($token)) {
            return $this->error('Invalid CSRF token', 403);
        }

        $userId = $this->getUserId();
        $username = $this->request->input('username');
        $email = $this->request->input('email');

        $errors = [];

        if (!empty($username) && !$this->userModel->validateUsername($username)) {
            $errors['username'] = 'Invalid username format';
        }

        if (!empty($email) && !$this->userModel->validateEmail($email)) {
            $errors['email'] = 'Invalid email format';
        }

        if (!empty($errors)) {
            return $this->json(['success' => false, 'errors' => $errors], 400);
        }

        $updateData = array_filter([
            'username' => $username,
            'email' => $email
        ]);

        $success = $this->userModel->updateProfile($userId, $updateData);

        if ($success) {
            // Update session
            $user = $this->userModel->getSafeUser($userId);
            $_SESSION['user'] = $user;
            $_SESSION['username'] = $user['username'];

            return $this->success(['user' => $user], 'Profile updated successfully');
        }

        return $this->error('Failed to update profile', 500);
    }

    /**
     * Change password
     */
    public function changePassword(): Response
    {
        // Require authentication
        $authCheck = $this->requireAuth();
        if ($authCheck) return $authCheck;

        // Validate CSRF token
        $token = $this->request->input('csrf_token');
        if (!$this->verifyCsrfToken($token)) {
            return $this->error('Invalid CSRF token', 403);
        }

        $userId = $this->getUserId();
        $currentPassword = $this->request->input('current_password');
        $newPassword = $this->request->input('new_password');
        $confirmPassword = $this->request->input('confirm_password');

        $errors = [];

        if (empty($currentPassword)) {
            $errors['current_password'] = 'Current password is required';
        }

        if (empty($newPassword)) {
            $errors['new_password'] = 'New password is required';
        } else {
            $passwordErrors = $this->userModel->validatePassword($newPassword);
            if (!empty($passwordErrors)) {
                $errors['new_password'] = implode(', ', $passwordErrors);
            }
        }

        if ($newPassword !== $confirmPassword) {
            $errors['confirm_password'] = 'Passwords do not match';
        }

        if (!empty($errors)) {
            return $this->json(['success' => false, 'errors' => $errors], 400);
        }

        $success = $this->userModel->changePassword($userId, $currentPassword, $newPassword);

        if ($success) {
            return $this->success([], 'Password changed successfully');
        }

        return $this->error('Failed to change password. Check your current password.', 400);
    }
}
