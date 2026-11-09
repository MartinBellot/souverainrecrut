# ======================================================
# Image Jenkins de la CI SouverainRecrut
#   Jenkins LTS + plugins + Node.js 22 + CLI Docker (buildx) + Trivy
#   Configuration entièrement "as code" (JCasC, cf. casc.yaml).
# ======================================================
FROM jenkins/jenkins:lts-jdk21

ARG TARGETARCH
ARG NODE_VERSION=22.12.0
ARG DOCKER_CLI_VERSION=27.4.1
ARG TRIVY_VERSION=0.76.1

USER root

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates xz-utils \
 && rm -rf /var/lib/apt/lists/*

# Node.js 22 (version exigée par backend/package.json → engines)
RUN case "${TARGETARCH}" in arm64) a=arm64 ;; *) a=x64 ;; esac \
 && curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${a}.tar.xz" \
    | tar -xJ -C /usr/local --strip-components=1 \
 && node --version && npm --version

# CLI Docker (le démon est celui de l'hôte, via /var/run/docker.sock)
RUN case "${TARGETARCH}" in arm64) a=aarch64 ;; *) a=x86_64 ;; esac \
 && curl -fsSL "https://download.docker.com/linux/static/stable/${a}/docker-${DOCKER_CLI_VERSION}.tgz" \
    | tar -xz -C /usr/local/bin --strip-components=1 docker/docker \
 && docker --version

# Plugin buildx (BuildKit) : nécessaire pour construire une image d'une autre
# architecture (linux/amd64 pour le VPS) depuis un hôte arm64. Binaire vérifié par SHA-256.
ARG BUILDX_VERSION=0.38.1
RUN case "${TARGETARCH}" in arm64) a=arm64 ;; *) a=amd64 ;; esac \
 && base="https://github.com/docker/buildx/releases/download/v${BUILDX_VERSION}" \
 && file="buildx-v${BUILDX_VERSION}.linux-${a}" \
 && mkdir -p /usr/local/lib/docker/cli-plugins \
 && cd /tmp \
 && curl -fsSLO "${base}/${file}" \
 && curl -fsSL "${base}/checksums.txt" | grep " \*\?${file}$" | sed 's/ \*/  /' | sha256sum -c - \
 && install -m 0755 "${file}" /usr/local/lib/docker/cli-plugins/docker-buildx \
 && rm -f "${file}" \
 && docker buildx version

# Trivy (scan de vulnérabilités de l'image), archive vérifiée par SHA-256
RUN case "${TARGETARCH}" in arm64) a=ARM64 ;; *) a=64bit ;; esac \
 && base="https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}" \
 && file="trivy_${TRIVY_VERSION}_Linux-${a}.tar.gz" \
 && cd /tmp \
 && curl -fsSLO "${base}/${file}" \
 && curl -fsSL "${base}/trivy_${TRIVY_VERSION}_checksums.txt" | grep " ${file}$" | sha256sum -c - \
 && tar -xzf "${file}" -C /usr/local/bin trivy \
 && rm -f "${file}" \
 && trivy --version

USER jenkins

# Plugins : Git, Pipeline, SonarQube, Docker, JCasC…
COPY --chown=jenkins:jenkins plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

# Pas d'assistant d'installation : tout est configuré par JCasC
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false"
ENV CASC_JENKINS_CONFIG=/var/jenkins_home/casc.yaml
COPY --chown=jenkins:jenkins casc.yaml /var/jenkins_home/casc.yaml
