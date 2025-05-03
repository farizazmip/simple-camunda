FROM camunda/camunda-bpm-platform:run-7.22.0

USER root
RUN apk add --no-cache git zip
USER camunda
RUN git clone https://github.com/datakurre/camunda-cockpit-plugins.git /camunda/META-INF/resources/webjars/camunda/app/cockpit/scripts/
RUN chown camunda:camunda /camunda/META-INF/resources/webjars/camunda/app/cockpit/scripts/
RUN zip -r internal/webapps/camunda-webapp-webjar-7.15.0.jar META-INF
RUN rm -r META-INF

# Add Keycloak
ENV IDENTITY_PROVIDER_VERSION=7.22.0
RUN wget https://artifacts.camunda.com/artifactory/camunda-bpm-community-extensions/org/camunda/bpm/extension/camunda-platform-7-keycloak-run/$IDENTITY_PROVIDER_VERSION/camunda-platform-7-keycloak-run-$IDENTITY_PROVIDER_VERSION.jar -P /camunda/configuration/userlib
