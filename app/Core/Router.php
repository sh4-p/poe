<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Router - URL Routing System
 * Maps URLs to controller actions
 */
class Router
{
    private array $routes = [];
    private array $middleware = [];
    private ?string $currentRoute = null;

    /**
     * Add GET route
     */
    public function get(string $path, string $handler): self
    {
        return $this->addRoute('GET', $path, $handler);
    }

    /**
     * Add POST route
     */
    public function post(string $path, string $handler): self
    {
        return $this->addRoute('POST', $path, $handler);
    }

    /**
     * Add PUT route
     */
    public function put(string $path, string $handler): self
    {
        return $this->addRoute('PUT', $path, $handler);
    }

    /**
     * Add DELETE route
     */
    public function delete(string $path, string $handler): self
    {
        return $this->addRoute('DELETE', $path, $handler);
    }

    /**
     * Add route to routing table
     */
    private function addRoute(string $method, string $path, string $handler): self
    {
        $path = rtrim($path, '/') ?: '/';

        $this->routes[] = [
            'method' => $method,
            'path' => $path,
            'handler' => $handler,
            'regex' => $this->convertToRegex($path),
            'middleware' => []
        ];

        $this->currentRoute = count($this->routes) - 1;

        return $this;
    }

    /**
     * Add middleware to last defined route
     */
    public function middleware(string|array $middleware): self
    {
        if ($this->currentRoute !== null) {
            $middleware = is_array($middleware) ? $middleware : [$middleware];
            $this->routes[$this->currentRoute]['middleware'] = array_merge(
                $this->routes[$this->currentRoute]['middleware'],
                $middleware
            );
        }

        return $this;
    }

    /**
     * Register global middleware
     */
    public function registerMiddleware(string $name, callable $callback): void
    {
        $this->middleware[$name] = $callback;
    }

    /**
     * Convert route path to regex pattern
     */
    private function convertToRegex(string $path): string
    {
        // Convert {param} to named capture groups
        $pattern = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '(?P<$1>[^/]+)', $path);

        // Escape forward slashes
        $pattern = str_replace('/', '\/', $pattern);

        return '/^' . $pattern . '$/';
    }

    /**
     * Dispatch request to appropriate controller
     */
    public function dispatch(Request $request): Response
    {
        $method = $request->getMethod();
        $uri = $request->getUri();

        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }

            if (preg_match($route['regex'], $uri, $matches)) {
                // Extract route parameters
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
                $request->setParams($params);

                // Execute middleware
                foreach ($route['middleware'] as $middlewareName) {
                    if (isset($this->middleware[$middlewareName])) {
                        $result = ($this->middleware[$middlewareName])($request);

                        if ($result instanceof Response) {
                            return $result;
                        }
                    }
                }

                // Call controller action
                return $this->callController($route['handler'], $request);
            }
        }

        // 404 Not Found
        return Response::error('Route not found', 404);
    }

    /**
     * Call controller action
     */
    private function callController(string $handler, Request $request): Response
    {
        [$controllerName, $action] = explode('@', $handler);

        $controllerClass = "App\\Controllers\\{$controllerName}";

        if (!class_exists($controllerClass)) {
            error_log("Controller not found: {$controllerClass}");
            return Response::error('Controller not found', 500);
        }

        $controller = new $controllerClass($request);

        if (!method_exists($controller, $action)) {
            error_log("Action not found: {$controllerClass}@{$action}");
            return Response::error('Action not found', 500);
        }

        try {
            $response = $controller->$action();

            // Ensure response is Response object
            if (!($response instanceof Response)) {
                if (is_array($response)) {
                    return Response::jsonResponse($response);
                } elseif (is_string($response)) {
                    return Response::htmlResponse($response);
                } else {
                    return Response::htmlResponse((string) $response);
                }
            }

            return $response;
        } catch (\Exception $e) {
            error_log("Controller error: " . $e->getMessage());
            error_log($e->getTraceAsString());

            return Response::error(
                $_ENV['APP_DEBUG'] === 'true' ? $e->getMessage() : 'Internal server error',
                500
            );
        }
    }

    /**
     * Get all registered routes
     */
    public function getRoutes(): array
    {
        return $this->routes;
    }
}
