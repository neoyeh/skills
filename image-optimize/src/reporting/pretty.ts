import kleur from 'kleur';
import type { RunReport } from '../types.js';

function fmtBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)}MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)}GB`;
}

function fmtPct(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

export function formatPretty(report: RunReport): string {
  const lines: string[] = [];

  if (report.configSource) {
    lines.push(kleur.dim(`config: ${report.configSource}`));
  } else {
    lines.push(kleur.dim('config: built-in defaults'));
  }
  lines.push(
    kleur.dim(`profile: ${report.profile}  quality: ${report.qualityLevel}`),
  );
  lines.push('');

  for (const p of report.processed) {
    const arrow = p.inputFormat === p.outputFormat ? '→' : '↣';
    const savings = kleur.green(`-${fmtPct(p.savedRatio)}`);
    lines.push(
      `${kleur.green('✓')} ${p.input} ${arrow} ${p.output}  ` +
        kleur.dim(`(${fmtBytes(p.inputBytes)} → ${fmtBytes(p.outputBytes)}`) +
        ` ${savings}` +
        kleur.dim(')'),
    );
  }

  for (const s of report.skipped) {
    const arrow = s.output ? ` → ${s.output}` : '';
    lines.push(
      `${kleur.yellow('-')} ${s.input}${arrow}  ${kleur.dim(`(${s.reason}, copied as-is)`)}`,
    );
  }

  for (const e of report.errors) {
    lines.push(`${kleur.red('✗')} ${e.input}  ${kleur.red(e.message)}`);
  }

  lines.push('');
  const sum = report.summary;
  lines.push(
    kleur.bold(
      `${sum.processedCount}/${sum.totalFiles} processed, ` +
        `${sum.skippedCount} skipped, ${sum.errorCount} errors`,
    ),
  );
  if (sum.totalInputBytes > 0) {
    lines.push(
      kleur.bold(
        `total: ${fmtBytes(sum.totalInputBytes)} → ${fmtBytes(sum.totalOutputBytes)} ` +
          `(${kleur.green(`-${fmtPct(sum.totalSavedRatio)}`)})`,
      ),
    );
  }

  return lines.join('\n');
}
