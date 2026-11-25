import os

TEST_DATABASE_DEFAULTS = {
    "APP_ENV": "test",
    "DATABASE_HOST": "127.0.0.1",
    "DATABASE_PORT": "5432",
    "DATABASE_NAME": "anywayone_test_placeholder",
    "DATABASE_USER": "anywayone_test_placeholder",
    "DATABASE_PASSWORD": "anywayone_test_placeholder",
    "DATABASE_SSL_MODE": "disable",
}

for name, value in TEST_DATABASE_DEFAULTS.items():
    os.environ.setdefault(name, value)
