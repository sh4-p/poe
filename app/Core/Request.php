<?php

declare(strict_types=1);

namespace App\Core;

/**
 * HTTP Request Handler
 * Manages incoming HTTP requests
 */
class Request
{
    private string $method;
    private string $uri;
    private array $params;
    private array $query;
    private array $body;
    private array $server;
    private array $headers;

    public function __construct()
    {
        $this->method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $this->uri = $this->parseUri();
        $this->params = [];
        $this->query = $_GET ?? [];
        $this->body = $this->parseBody();
        $this->server = $_SERVER;
        $this->headers = $this->parseHeaders();
    }

    /**
     * Parse URI from request
     */
    private function parseUri(): string
    {
        $uri = $_SERVER['REQUEST_URI'] ?? '/';

        // Remove query string
        if (false !== $pos = strpos($uri, '?')) {
            $uri = substr($uri, 0, $pos);
        }

        return rtrim($uri, '/') ?: '/';
    }

    /**
     * Parse request body
     */
    private function parseBody(): array
    {
        if ($this->method === 'POST' || $this->method === 'PUT' || $this->method === 'PATCH') {
            $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

            if (strpos($contentType, 'application/json') !== false) {
                $json = file_get_contents('php://input');
                return json_decode($json, true) ?? [];
            }

            return $_POST ?? [];
        }

        return [];
    }

    /**
     * Parse HTTP headers
     */
    private function parseHeaders(): array
    {
        $headers = [];

        foreach ($_SERVER as $key => $value) {
            if (strpos($key, 'HTTP_') === 0) {
                $header = str_replace('_', '-', substr($key, 5));
                $headers[$header] = $value;
            }
        }

        return $headers;
    }

    /**
     * Get request method
     */
    public function getMethod(): string
    {
        return $this->method;
    }

    /**
     * Get request URI
     */
    public function getUri(): string
    {
        return $this->uri;
    }

    /**
     * Set route parameters
     */
    public function setParams(array $params): void
    {
        $this->params = $params;
    }

    /**
     * Get route parameter
     */
    public function param(string $key, mixed $default = null): mixed
    {
        return $this->params[$key] ?? $default;
    }

    /**
     * Get query parameter
     */
    public function query(string $key, mixed $default = null): mixed
    {
        return $this->query[$key] ?? $default;
    }

    /**
     * Get all query parameters
     */
    public function allQuery(): array
    {
        return $this->query;
    }

    /**
     * Get body parameter
     */
    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $default;
    }

    /**
     * Get all body parameters
     */
    public function all(): array
    {
        return array_merge($this->query, $this->body);
    }

    /**
     * Get header value
     */
    public function header(string $key, mixed $default = null): mixed
    {
        $key = strtoupper(str_replace('-', '_', $key));
        return $this->headers[$key] ?? $default;
    }

    /**
     * Check if request is AJAX
     */
    public function isAjax(): bool
    {
        return strtolower($this->header('X-REQUESTED-WITH', '')) === 'xmlhttprequest';
    }

    /**
     * Check if request is JSON
     */
    public function isJson(): bool
    {
        return strpos($this->header('CONTENT-TYPE', ''), 'application/json') !== false;
    }

    /**
     * Check if request expects JSON response
     */
    public function expectsJson(): bool
    {
        return $this->isAjax() || $this->isJson();
    }

    /**
     * Get client IP address
     */
    public function ip(): string
    {
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }

    /**
     * Get user agent
     */
    public function userAgent(): string
    {
        return $_SERVER['HTTP_USER_AGENT'] ?? '';
    }
}
