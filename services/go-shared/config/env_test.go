package config

import (
	"os"
	"testing"
)

func TestGetEnv_SetVariable(t *testing.T) {
	if err := os.Setenv("TEST_GETENV_KEY", "hello"); err != nil {
		t.Fatal(err)
	}
	defer os.Unsetenv("TEST_GETENV_KEY")

	if got := GetEnv("TEST_GETENV_KEY", "fallback"); got != "hello" {
		t.Errorf("expected %q, got %q", "hello", got)
	}
}

func TestGetEnv_UnsetVariable(t *testing.T) {
	os.Unsetenv("TEST_GETENV_MISSING")

	if got := GetEnv("TEST_GETENV_MISSING", "default_value"); got != "default_value" {
		t.Errorf("expected %q, got %q", "default_value", got)
	}
}
