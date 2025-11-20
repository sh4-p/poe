<?php

declare(strict_types=1);

namespace App\Core;

/**
 * HTTP Response Handler
 * Manages outgoing HTTP responses
 */
class Response
{
    private int $statusCode = 200;
    private array $headers = [];
    private string $content = '';

    /**
     * Set HTTP status code
     */
    public function setStatusCode(int $code): self
    {
        $this->statusCode = $code;
        return $this;
    }

    /**
     * Set response header
     */
    public function setHeader(string $key, string $value): self
    {
        $this->headers[$key] = $value;
        return $this;
    }

    /**
     * Set content
     */
    public function setContent(string $content): self
    {
        $this->content = $content;
        return $this;
    }

    /**
     * Send JSON response
     */
    public function json(array $data, int $statusCode = 200): self
    {
        $this->setStatusCode($statusCode);
        $this->setHeader('Content-Type', 'application/json');
        $this->setContent(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $this;
    }

    /**
     * Send HTML response
     */
    public function html(string $html, int $statusCode = 200): self
    {
        $this->setStatusCode($statusCode);
        $this->setHeader('Content-Type', 'text/html; charset=UTF-8');
        $this->setContent($html);
        return $this;
    }

    /**
     * Redirect to URL
     */
    public function redirect(string $url, int $statusCode = 302): self
    {
        $this->setStatusCode($statusCode);
        $this->setHeader('Location', $url);
        return $this;
    }

    /**
     * Send response to client
     */
    public function send(): void
    {
        // Set HTTP status code
        http_response_code($this->statusCode);

        // Send headers
        foreach ($this->headers as $key => $value) {
            header("$key: $value");
        }

        // Send content
        echo $this->content;
    }

    /**
     * Create JSON response (static helper)
     */
    public static function jsonResponse(array $data, int $statusCode = 200): self
    {
        return (new self())->json($data, $statusCode);
    }

    /**
     * Create HTML response (static helper)
     */
    public static function htmlResponse(string $html, int $statusCode = 200): self
    {
        return (new self())->html($html, $statusCode);
    }

    /**
     * Create redirect response (static helper)
     */
    public static function redirectTo(string $url, int $statusCode = 302): self
    {
        return (new self())->redirect($url, $statusCode);
    }

    /**
     * Create error response
     */
    public static function error(string $message, int $statusCode = 500): self
    {
        return (new self())->json([
            'success' => false,
            'error' => $message
        ], $statusCode);
    }

    /**
     * Create success response
     */
    public static function success(array $data = [], string $message = 'Success'): self
    {
        return (new self())->json([
            'success' => true,
            'message' => $message,
            'data' => $data
        ], 200);
    }
}
