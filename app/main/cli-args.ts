export function cliArg(flag: string): string | undefined {
  const prefix = `--${flag}=`
  return process.argv.find(a => a.startsWith(prefix))?.slice(prefix.length)
}

export function cliPort(flag: string, fallback: number): number {
  const raw = cliArg(flag)
  return raw ? parseInt(raw, 10) : fallback
}
