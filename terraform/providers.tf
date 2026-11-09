# ======================================================
# Providers
# Pas d'ESXi/vCenter : le provider vSphere est inutilisable. Terraform gère donc
# les ressources réellement disponibles autour du VPS existant :
#   - tls   : paire de clés SSH dédiée au déploiement (GitLab CI)
#   - null  : vérification à distance du serveur (SSH, OS, architecture, Internet)
#   - local : génération de l'inventaire et des variables Ansible
# ======================================================
terraform {
  required_version = ">= 1.6"

  required_providers {
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}
