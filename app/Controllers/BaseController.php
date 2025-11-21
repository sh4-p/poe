<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use Twig\Environment;
use Twig\Loader\FilesystemLoader;

/**
 * Base Controller
 * Abstract base class for all controllers
 */
abstract class BaseController
{
    protected Request $request;
    protected ?Environment $twig = null;

    public function __construct(Request $request)
    {
        $this->request = $request;
        $this->initializeTwig();
    }

    /**
     * Initialize Twig templating engine
     */
    private function initializeTwig(): void
    {
        $loader = new FilesystemLoader(__DIR__ . '/../Views');

        $this->twig = new Environment($loader, [
            'cache' => $_ENV['APP_ENV'] === 'production' ? __DIR__ . '/../../storage/cache/twig' : false,
            'debug' => $_ENV['APP_DEBUG'] === 'true',
            'auto_reload' => true,
        ]);

        // Add global variables
        $this->twig->addGlobal('app_name', $_ENV['APP_NAME'] ?? 'Exile Architect');
        $this->twig->addGlobal('app_url', $_ENV['APP_URL'] ?? '');
        $this->twig->addGlobal('current_uri', $this->request->getUri());

        // Add session data if available
        if (session_status() === PHP_SESSION_ACTIVE) {
            $this->twig->addGlobal('session', $_SESSION);
            $this->twig->addGlobal('user', $_SESSION['user'] ?? null);
        }
    }

    /**
     * Render Twig template
     */
    protected function render(string $view, array $data = []): Response
    {
        try {
            $html = $this->twig->render($view, $data);
            return Response::htmlResponse($html);
        } catch (\Exception $e) {
            error_log("Template rendering error: " . $e->getMessage());
            return Response::error('Template error', 500);
        }
    }

    /**
     * Return JSON response
     */
    protected function json(array $data, int $statusCode = 200): Response
    {
        return Response::jsonResponse($data, $statusCode);
    }

    /**
     * Return success JSON response
     */
    protected function success(array $data = [], string $message = 'Success'): Response
    {
        return Response::success($data, $message);
    }

    /**
     * Return error JSON response
     */
    protected function error(string $message, int $statusCode = 400): Response
    {
        return Response::error($message, $statusCode);
    }

    /**
     * Redirect to URL
     */
    protected function redirect(string $url, int $statusCode = 302): Response
    {
        return Response::redirectTo($url, $statusCode);
    }

    /**
     * Validate request data
     */
    protected function validate(array $data, array $rules): array
    {
        $errors = [];

        foreach ($rules as $field => $rule) {
            $ruleList = explode('|', $rule);

            foreach ($ruleList as $singleRule) {
                $ruleName = $singleRule;
                $ruleValue = null;

                // Parse rule with parameters (e.g., min:3)
                if (strpos($singleRule, ':') !== false) {
                    [$ruleName, $ruleValue] = explode(':', $singleRule, 2);
                }

                // Apply validation rules
                switch ($ruleName) {
                    case 'required':
                        if (!isset($data[$field]) || empty($data[$field])) {
                            $errors[$field][] = "{$field} is required";
                        }
                        break;

                    case 'email':
                        if (isset($data[$field]) && !filter_var($data[$field], FILTER_VALIDATE_EMAIL)) {
                            $errors[$field][] = "{$field} must be a valid email";
                        }
                        break;

                    case 'min':
                        if (isset($data[$field]) && strlen($data[$field]) < (int)$ruleValue) {
                            $errors[$field][] = "{$field} must be at least {$ruleValue} characters";
                        }
                        break;

                    case 'max':
                        if (isset($data[$field]) && strlen($data[$field]) > (int)$ruleValue) {
                            $errors[$field][] = "{$field} must not exceed {$ruleValue} characters";
                        }
                        break;

                    case 'numeric':
                        if (isset($data[$field]) && !is_numeric($data[$field])) {
                            $errors[$field][] = "{$field} must be numeric";
                        }
                        break;

                    case 'alpha':
                        if (isset($data[$field]) && !ctype_alpha($data[$field])) {
                            $errors[$field][] = "{$field} must contain only letters";
                        }
                        break;

                    case 'alphanumeric':
                        if (isset($data[$field]) && !ctype_alnum($data[$field])) {
                            $errors[$field][] = "{$field} must contain only letters and numbers";
                        }
                        break;
                }
            }
        }

        return $errors;
    }

    /**
     * Check if user is authenticated
     */
    protected function isAuthenticated(): bool
    {
        return isset($_SESSION['user_id']);
    }

    /**
     * Require authentication
     */
    protected function requireAuth(): ?Response
    {
        if (!$this->isAuthenticated()) {
            if ($this->request->expectsJson()) {
                return $this->error('Unauthorized', 401);
            }

            return $this->redirect('/login');
        }

        return null;
    }

    /**
     * Get current user ID
     */
    protected function getUserId(): ?int
    {
        return $_SESSION['user_id'] ?? null;
    }

    /**
     * Generate CSRF token
     */
    protected function generateCsrfToken(): string
    {
        if (!isset($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }

        return $_SESSION['csrf_token'];
    }

    /**
     * Verify CSRF token
     */
    protected function verifyCsrfToken(string $token): bool
    {
        return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
    }
}
