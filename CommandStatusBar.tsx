@import "tailwindcss";
@import "tw-animate-css";

:root {
  --bg: #f5f5f0;
  --bg-card: #ffffff;
  --primary: #5b7a5b;
  --primary-dark: #4a6349;
  --secondary: #8b7355;
  --accent: #7c9885;
  --text: #3d3d3d;
  --text-light: #6b6b6b;
  --border: #e0ddd5;
  --shadow: rgba(0, 0, 0, 0.08);
}

body {
  font-family: 'Inter', sans-serif;
  background: var(--bg);
  color: var(--text);
  margin: 0;
  padding: 0;
}

.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 2px 8px var(--shadow);
}

.sidebar {
  background: linear-gradient(180deg, #4a6349 0%, #3d5340 100%);
  color: white;
}

.navbar {
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  box-shadow: 0 1px 3px var(--shadow);
}

.button-primary {
  background: var(--primary);
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.button-primary:hover {
  background: var(--primary-dark);
}

.button-secondary {
  background: transparent;
  color: var(--primary);
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid var(--primary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.button-secondary:hover {
  background: var(--primary);
  color: white;
}

.text-primary {
  color: var(--primary);
}

.text-secondary {
  color: var(--secondary);
}

.text-muted {
  color: var(--text-light);
}

input, select, textarea {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 14px;
  color: var(--text);
  transition: border-color 0.2s ease;
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: var(--primary);
}

input::placeholder {
  color: var(--text-light);
}

.status-online {
  color: #5b7a5b;
}

.status-offline {
  color: #b5836d;
}

.status-warning {
  color: #c9a227;
}
