package api

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/url"
	"slices"
	"strings"
	"testing"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) {
	return f(r)
}

func jsonResponse(body string) *http.Response {
	return &http.Response{
		StatusCode: http.StatusOK,
		Header:     http.Header{"Content-Type": []string{"application/json"}},
		Body:       io.NopCloser(strings.NewReader(body)),
	}
}

func urlError(u string) error {
	return &url.Error{Op: http.MethodGet, URL: u, Err: errors.New("dial tcp: connect: connection refused")}
}

func TestClientPrefersFallbackWhenAvailable(t *testing.T) {
	t.Parallel()

	client := NewClient("http://api-server:8080")
	client.baseURL = "http://api-server:8080"
	client.fallbackBaseURL = "http://localhost:8080"
	client.preferFallback = true

	var requests []string
	client.httpClient = &http.Client{
		Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
			requests = append(requests, r.URL.String())
			if r.URL.String() == "http://localhost:8080/users" {
				return jsonResponse("[]"), nil
			}
			t.Fatalf("unexpected request to %s", r.URL.String())
			return nil, nil
		}),
	}

	if _, err := client.ListUsers(context.Background()); err != nil {
		t.Fatalf("ListUsers returned error: %v", err)
	}

	if len(requests) != 1 || requests[0] != "http://localhost:8080/users" {
		t.Fatalf("expected request to fallback, got %v", requests)
	}

	if client.baseURL != "http://localhost:8080" {
		t.Fatalf("expected baseURL to switch to fallback, got %q", client.baseURL)
	}

	if client.fallbackBaseURL != "" {
		t.Fatalf("expected fallbackBaseURL to be cleared, got %q", client.fallbackBaseURL)
	}
}

func TestClientFallsBackAfterInitialFailure(t *testing.T) {
	t.Parallel()

	client := NewClient("http://api-server:8080")
	client.baseURL = "http://primary.example"
	client.fallbackBaseURL = "http://localhost:8080"
	client.preferFallback = true

	var requests []string
	client.httpClient = &http.Client{
		Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
			requests = append(requests, r.URL.String())
			switch r.URL.String() {
			case "http://localhost:8080/users":
				return nil, urlError(r.URL.String())
			case "http://primary.example/users":
				return jsonResponse("[]"), nil
			default:
				t.Fatalf("unexpected request to %s", r.URL.String())
			}
			return nil, nil
		}),
	}

	if _, err := client.ListUsers(context.Background()); err != nil {
		t.Fatalf("ListUsers returned error: %v", err)
	}

	expected := []string{"http://localhost:8080/users", "http://primary.example/users"}
	if !slices.Equal(requests, expected) {
		t.Fatalf("unexpected request order: %v", requests)
	}

	if client.preferFallback {
		t.Fatalf("expected preferFallback to be disabled after failed attempt")
	}

	if client.baseURL != "http://primary.example" {
		t.Fatalf("expected baseURL to remain primary, got %q", client.baseURL)
	}
}

func TestClientUsesFallbackWhenPrimaryFails(t *testing.T) {
	t.Parallel()

	client := NewClient("http://api-server:8080")
	client.baseURL = "http://primary.example"
	client.fallbackBaseURL = "http://localhost:8080"
	client.preferFallback = false

	var requests []string
	client.httpClient = &http.Client{
		Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
			requests = append(requests, r.URL.String())
			switch r.URL.String() {
			case "http://primary.example/users":
				return nil, urlError(r.URL.String())
			case "http://localhost:8080/users":
				return jsonResponse("[]"), nil
			default:
				t.Fatalf("unexpected request to %s", r.URL.String())
			}
			return nil, nil
		}),
	}

	if _, err := client.ListUsers(context.Background()); err != nil {
		t.Fatalf("ListUsers returned error: %v", err)
	}

	expected := []string{"http://primary.example/users", "http://localhost:8080/users"}
	if !slices.Equal(requests, expected) {
		t.Fatalf("unexpected request order: %v", requests)
	}

	if client.baseURL != "http://localhost:8080" {
		t.Fatalf("expected baseURL to switch to fallback, got %q", client.baseURL)
	}

	if client.fallbackBaseURL != "" {
		t.Fatalf("expected fallbackBaseURL to be cleared after success, got %q", client.fallbackBaseURL)
	}
}
