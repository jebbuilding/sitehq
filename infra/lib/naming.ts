import type { EnvironmentConfig, ProjectConfig } from "../config.ts";

/** Everything derived from the project + environment names, so no stack spells a name itself. */
export class Names {
  constructor(
    private readonly project: ProjectConfig,
    private readonly e: EnvironmentConfig,
  ) {}

  /** sitehq-dev, sitehq-prod: the start of every resource name, and the main stack's name. */
  get prefix(): string {
    return `${this.project.project}-${this.e.envName}`;
  }
  /** sitehq-dev-<what> */
  resource(what: string): string {
    return `${this.prefix}-${what}`;
  }
  /** Bucket names are global to AWS, so they also carry the account id. */
  bucket(what: string): string {
    return `${this.prefix}-${what}-${this.e.account}`;
  }
  /** dev.example.com */
  get siteDomain(): string {
    return `${this.e.subdomain}.${this.e.domain}`;
  }
  get siteOrigin(): string {
    return `https://${this.siteDomain}`;
  }
  /** ws.dev.example.com – live updates */
  get wsDomain(): string {
    return `ws.${this.siteDomain}`;
  }
  /** Sign-in emails come from here. */
  get emailFrom(): string {
    return `no-reply@${this.siteDomain}`;
  }
  get tags(): Record<string, string> {
    return { project: this.project.project, env: this.e.envName };
  }
  get stackNames(): { main: string; edge: string; bootstrap: string } {
    return {
      main: this.prefix,
      edge: this.resource("edge"),
      bootstrap: this.resource("bootstrap"),
    };
  }
  get deployRoleName(): string {
    return this.resource("github-deploy");
  }
}
