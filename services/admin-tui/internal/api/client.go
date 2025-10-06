package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Client struct {
	baseURL         string
	httpClient      *http.Client
	fallbackBaseURL string
}

type User struct {
	ID        string  `json:"id"`
	Email     string  `json:"email"`
	Name      string  `json:"name"`
	Role      string  `json:"role"`
	AvatarURL *string `json:"avatar_url"`
	CreatedAt string  `json:"created_at"`
	UpdatedAt string  `json:"updated_at"`
}

type CreateUserRequest struct {
	Name      string  `json:"name"`
	Email     string  `json:"email"`
	Role      string  `json:"role"`
	AvatarURL *string `json:"avatar_url,omitempty"`
}

var ErrNotFound = errors.New("resource not found")

func NewClient(rawURL string) *Client {
	base := strings.TrimSuffix(strings.TrimSpace(rawURL), "/")
	fallback := ""

	if base == "" {
		base = "http://localhost:8080"
	}

	if parsed, err := url.Parse(base); err == nil {
		if host := parsed.Hostname(); host == "api-server" {
			fallback = "http://localhost:8080"
		}
	}

	return &Client{
		baseURL:         base,
		fallbackBaseURL: fallback,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (c *Client) WithHTTPClient(client *http.Client) {
	if client != nil {
		c.httpClient = client
	}
}

func (c *Client) doRequest(ctx context.Context, method, path string, body any) (*http.Response, error) {
	resp, err := c.doRequestWithBase(ctx, c.baseURL, method, path, body)
	if err == nil {
		return resp, nil
	}

	if c.fallbackBaseURL == "" {
		return nil, err
	}

	var urlErr *url.Error
	if !errors.As(err, &urlErr) {
		return nil, err
	}

	resp, fallbackErr := c.doRequestWithBase(ctx, c.fallbackBaseURL, method, path, body)
	if fallbackErr != nil {
		return nil, fallbackErr
	}

	c.baseURL = c.fallbackBaseURL
	c.fallbackBaseURL = ""
	return resp, nil
}

func (c *Client) doRequestWithBase(ctx context.Context, base string, method, path string, body any) (*http.Response, error) {
	fullURL, err := buildURL(base, path)
	if err != nil {
		return nil, err
	}

	var reqBody io.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to encode payload: %w", err)
		}
		reqBody = bytes.NewReader(encoded)
	}

	req, err := http.NewRequestWithContext(ctx, method, fullURL, reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to build request: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}

	return resp, nil
}

func buildURL(base, path string) (string, error) {
	cleaned := "/" + strings.TrimPrefix(path, "/")
	u, err := url.Parse(strings.TrimSuffix(base, "/") + cleaned)
	if err != nil {
		return "", fmt.Errorf("invalid API URL: %w", err)
	}

	return u.String(), nil
}

func decodeJSON[T any](r io.Reader) (T, error) {
	var zero T
	dec := json.NewDecoder(r)
	if err := dec.Decode(&zero); err != nil {
		return zero, err
	}
	return zero, nil
}

func (c *Client) ListUsers(ctx context.Context) ([]User, error) {
	resp, err := c.doRequest(ctx, http.MethodGet, "/users", nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, ErrNotFound
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return nil, fmt.Errorf("failed to list users: %s", strings.TrimSpace(string(body)))
	}

	users, err := decodeJSON[[]User](resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to parse users: %w", err)
	}

	return users, nil
}

func (c *Client) CreateUser(ctx context.Context, payload CreateUserRequest) (User, error) {
	resp, err := c.doRequest(ctx, http.MethodPost, "/users", payload)
	if err != nil {
		return User{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return User{}, fmt.Errorf("failed to create user: %s", strings.TrimSpace(string(body)))
	}

	user, err := decodeJSON[User](resp.Body)
	if err != nil {
		return User{}, fmt.Errorf("failed to parse new user: %w", err)
	}

	return user, nil
}

func (c *Client) DeleteUser(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return errors.New("user ID is required")
	}

	path := fmt.Sprintf("/users/%s", url.PathEscape(id))
	resp, err := c.doRequest(ctx, http.MethodDelete, path, nil)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return ErrNotFound
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return fmt.Errorf("failed to delete user: %s", strings.TrimSpace(string(body)))
	}

	io.Copy(io.Discard, resp.Body)
	return nil
}
