#!/bin/zsh

set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
install_dir="${HOME}/.local/bin"
target="${install_dir}/post"

mkdir -p "${install_dir}"

cat > "${target}" <<EOF
#!/bin/zsh
exec node "${repo_root}/scripts/post.mjs" "\$@"
EOF

chmod +x "${target}"
echo "Installed post command to ${target}"
