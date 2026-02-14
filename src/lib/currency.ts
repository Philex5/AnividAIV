/**
 * 金额转换工具函数
 * 统一处理美元与分之间的转换
 */

// 分转换为美元（显示用）
export function centsToDollars(cents: number): number {
  return cents / 100;
}

// 美元转换为分（存储用）
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

// 格式化美元显示
export function formatDollars(dollars: number): string {
  return `$${dollars.toFixed(2)}`;
}

// 格式化分显示为美元
export function formatCents(cents: number): string {
  return formatDollars(centsToDollars(cents));
}

// 安全转换为数字
export function toNumber(value: any): number {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}
