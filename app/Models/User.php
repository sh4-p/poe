<?php

declare(strict_types=1);

namespace App\Models;

/**
 * User Model
 * Handles user account operations
 */
class User extends BaseModel
{
    protected string $table = 'users';

    /**
     * Register new user
     */
    public function register(array $data): ?int
    {
        // Validate required fields
        if (!isset($data['username'], $data['email'], $data['password'])) {
            return null;
        }

        // Check if email already exists
        if ($this->findByEmail($data['email'])) {
            return null;
        }

        // Check if username already exists
        if ($this->findByUsername($data['username'])) {
            return null;
        }

        // Hash password
        $hashedPassword = $this->hashPassword($data['password']);

        // Create user
        return $this->create([
            'username' => $data['username'],
            'email' => $data['email'],
            'password_hash' => $hashedPassword,
        ]);
    }

    /**
     * Authenticate user
     */
    public function login(string $email, string $password): ?array
    {
        $user = $this->findByEmail($email);

        if (!$user) {
            return null;
        }

        if (!$this->verifyPassword($password, $user['password_hash'])) {
            return null;
        }

        // Remove password hash from returned data
        unset($user['password_hash']);

        return $user;
    }

    /**
     * Find user by email
     */
    public function findByEmail(string $email): ?array
    {
        return $this->whereFirst(['email' => $email]);
    }

    /**
     * Find user by username
     */
    public function findByUsername(string $username): ?array
    {
        return $this->whereFirst(['username' => $username]);
    }

    /**
     * Update user profile
     */
    public function updateProfile(int $userId, array $data): bool
    {
        // Remove password if present (use changePassword instead)
        unset($data['password'], $data['password_hash']);

        // Remove immutable fields
        unset($data['id'], $data['created_at']);

        if (empty($data)) {
            return false;
        }

        return $this->update($userId, $data);
    }

    /**
     * Change user password
     */
    public function changePassword(int $userId, string $currentPassword, string $newPassword): bool
    {
        $user = $this->find($userId);

        if (!$user) {
            return false;
        }

        // Verify current password
        if (!$this->verifyPassword($currentPassword, $user['password_hash'])) {
            return false;
        }

        // Hash new password
        $hashedPassword = $this->hashPassword($newPassword);

        return $this->update($userId, ['password_hash' => $hashedPassword]);
    }

    /**
     * Get user's build count
     */
    public function getBuildCount(int $userId): int
    {
        $sql = "SELECT COUNT(*) as count FROM builds WHERE user_id = ?";
        $result = $this->queryOne($sql, [$userId]);
        return (int)($result['count'] ?? 0);
    }

    /**
     * Get user statistics
     */
    public function getStats(int $userId): array
    {
        $sql = "
            SELECT
                (SELECT COUNT(*) FROM builds WHERE user_id = ?) as total_builds,
                (SELECT COUNT(*) FROM builds WHERE user_id = ? AND is_public = 1) as public_builds,
                (SELECT created_at FROM users WHERE id = ?) as member_since
        ";

        $result = $this->queryOne($sql, [$userId, $userId, $userId]);

        return [
            'total_builds' => (int)($result['total_builds'] ?? 0),
            'public_builds' => (int)($result['public_builds'] ?? 0),
            'member_since' => $result['member_since'] ?? null,
        ];
    }

    /**
     * Hash password
     */
    public function hashPassword(string $password): string
    {
        return password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    }

    /**
     * Verify password
     */
    public function verifyPassword(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }

    /**
     * Validate email format
     */
    public function validateEmail(string $email): bool
    {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    /**
     * Validate username
     */
    public function validateUsername(string $username): bool
    {
        // Username must be 3-50 characters, alphanumeric and underscores only
        return preg_match('/^[a-zA-Z0-9_]{3,50}$/', $username) === 1;
    }

    /**
     * Validate password strength
     */
    public function validatePassword(string $password): array
    {
        $errors = [];

        if (strlen($password) < 8) {
            $errors[] = 'Password must be at least 8 characters';
        }

        if (!preg_match('/[A-Z]/', $password)) {
            $errors[] = 'Password must contain at least one uppercase letter';
        }

        if (!preg_match('/[a-z]/', $password)) {
            $errors[] = 'Password must contain at least one lowercase letter';
        }

        if (!preg_match('/[0-9]/', $password)) {
            $errors[] = 'Password must contain at least one number';
        }

        return $errors;
    }

    /**
     * Get user without sensitive data
     */
    public function getSafeUser(int $userId): ?array
    {
        $user = $this->find($userId);

        if (!$user) {
            return null;
        }

        // Remove sensitive data
        unset($user['password_hash']);

        return $user;
    }
}
