#!/usr/bin/env python3
"""
update_link.py

Uso:
  1) Rode seu cloudflared assim, em background:
     cloudflared tunnel --url http://localhost:3000 > tunnel.log 2>&1 &

  2) Execute:
     python update_link.py

O script:
  - procura pela URL *.trycloudflare.com no arquivo tunnel.log
  - atualiza o campo app_url do manifest.json no repositório no GitHub via API
  - pede o token do GitHub na primeira execução e salva em ~/.config/gk_supl/token
"""

import re
import json
import os
import base64
import stat
import getpass
from pathlib import Path
from typing import Optional

try:
    import requests
except Exception as e:
    print("ERRO: a biblioteca 'requests' é necessária. Instale com: pip install requests")
    raise

# ---------- CONFIGURAÇÃO (ajuste se necessário) ----------
GITHUB_OWNER = "cleytonLuis"            # seu usuário GitHub
GITHUB_REPO  = "sistema-vendas-pwa"       # nome do repositório
GITHUB_FILEPATH = "manifest.json"         # caminho do arquivo a ser atualizado no repo
TUNNEL_LOG = "tunnel.log"                 # arquivo onde cloudflared grava a saída
LOCAL_MANIFEST = "manifest.json"          # arquivo local a atualizar também (opcional)
CONFIG_DIR = Path.home() / ".config" / "gk_supl"
TOKEN_FILE = CONFIG_DIR / "gh_token"
# ---------------------------------------------------------

def read_token() -> Optional[str]:
    if TOKEN_FILE.exists():
        return TOKEN_FILE.read_text().strip()
    return None

def save_token(token: str):
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    TOKEN_FILE.write_text(token)
    # permissions 600
    TOKEN_FILE.chmod(stat.S_IRUSR | stat.S_IWUSR)
    print(f"Token salvo em {TOKEN_FILE} (permissões 600)")

def prompt_for_token():
    print("É necessário um Personal Access Token (PAT) do GitHub com permissão 'Contents: Read & Write' para o repositório:")
    print(f"  https://github.com/{GITHUB_OWNER}/{GITHUB_REPO}")
    print("Você pode gerar um token em: https://github.com/settings/tokens (Fine-grained token recomendado).")
    token = getpass.getpass("Cole o token aqui (não será exibido): ").strip()
    if not token:
        raise SystemExit("Token não fornecido. Abortando.")
    save = input("Salvar token localmente para próximas execuções? [Y/n]: ").strip().lower()
    if save in ("", "y", "yes"):
        save_token(token)
    return token

def extract_trycloudflare_url_from_log(log_file: str) -> Optional[str]:
    if not os.path.exists(log_file):
        print(f"Arquivo de log '{log_file}' não encontrado.")
        return None
    pattern = re.compile(r'https?://[A-Za-z0-9\-]+\.trycloudflare\.com\b')
    url = None
    with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
        # lemos do final para pegar a última ocorrência
        for line in reversed(f.readlines()):
            m = pattern.search(line)
            if m:
                url = m.group(0)
                break
    return url

def get_file_sha(owner: str, repo: str, path: str, token: str) -> Optional[str]:
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
    headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github.v3+json"}
    r = requests.get(url, headers=headers)
    if r.status_code == 200:
        return r.json().get("sha")
    elif r.status_code == 404:
        return None
    else:
        raise RuntimeError(f"Erro ao buscar arquivo no GitHub: {r.status_code} {r.text}")

def update_file_on_github(owner: str, repo: str, path: str, content_bytes: bytes, message: str, token: str):
    sha = get_file_sha(owner, repo, path, token)
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
    headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github.v3+json"}
    data = {
        "message": message,
        "content": base64.b64encode(content_bytes).decode("utf-8"),
        "committer": {
            "name": "automation-bot",
            "email": "bot+automation@local"
        }
    }
    if sha:
        data["sha"] = sha
    r = requests.put(url, headers=headers, json=data)
    if r.status_code in (200,201):
        print("✅ Arquivo atualizado no GitHub com sucesso.")
        return True
    else:
        print("❌ Erro ao atualizar arquivo no GitHub:", r.status_code, r.text)
        return False

def load_local_manifest(path: str) -> dict:
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_local_manifest(path: str, data: dict):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Arquivo local {path} atualizado.")

def main():
    print("== Update Link -> GitHub manifest.json ==")
    token = read_token()
    if not token:
        token = prompt_for_token()

    url = extract_trycloudflare_url_from_log(TUNNEL_LOG)
    if not url:
        print("URL do tunnel não encontrada no log.")
        print("Certifique-se de que você rodou:")
        print(f"  cloudflared tunnel --url http://localhost:3000 > {TUNNEL_LOG} 2>&1 &")
        raise SystemExit(1)

    print(f"URL detectada no log: {url}")

    # Atualiza o manifest localmente antes de subir
    manifest = load_local_manifest(LOCAL_MANIFEST)
    manifest['app_url'] = url
    save_local_manifest(LOCAL_MANIFEST, manifest)

    # Prepara o content bytes (o mesmo arquivo manifest.json)
    content_bytes = json.dumps(manifest, ensure_ascii=False, indent=2).encode("utf-8")
    commit_message = f"Atualiza app_url para {url}"

    ok = update_file_on_github(GITHUB_OWNER, GITHUB_REPO, GITHUB_FILEPATH, content_bytes, commit_message, token)
    if ok:
        print("Pronto — o manifest.json no GitHub Pages foi atualizado. Aguarde alguns segundos e recarregue o PWA no celular.")
    else:
        print("Houve um erro ao atualizar no GitHub.")

if __name__ == "__main__":
    main()
