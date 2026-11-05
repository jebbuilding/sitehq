#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.ts";
import { buildApp } from "../lib/app.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
buildApp({ config, repoRoot }).app.synth();
