export interface GrpcurlRequest {
  targetUrl: string;
  serviceName: string;
  methodName: string;
  requestBody: string;
  metadata: Array<{ key: string; value: string }>;
}

// Wraps a value in single quotes, escaping any embedded single quotes with
// the standard POSIX '\'' trick so the result is safe to paste into
// bash/zsh/fish as-is.
function shellQuote(value: string): string {
  return `'${value.split("'").join(`'\\''`)}'`;
}

/**
 * Builds a `grpcurl` command for the given request. Always uses `-plaintext`
 * (the app has no TLS support) and relies on server reflection instead of
 * `-proto`/`-protoset`, so the result never references a local .proto file.
 */
export function buildGrpcurlCommand(req: GrpcurlRequest): string {
  const lines = ["grpcurl -plaintext"];

  for (const { key, value } of req.metadata) {
    const trimmedKey = key.trim();
    if (!trimmedKey) continue;
    lines.push(`-H ${shellQuote(`${trimmedKey}: ${value}`)}`);
  }

  const body = req.requestBody.trim();
  if (body) {
    lines.push(`-d ${shellQuote(body)}`);
  }

  lines.push(`${req.targetUrl} ${req.serviceName}/${req.methodName}`);

  return lines.join(" \\\n  ");
}
