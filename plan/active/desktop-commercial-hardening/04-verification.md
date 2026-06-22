# Verification Matrix

## Automated Checks

| Check | Windows | macOS | Evidence |
|---|---|---|---|
| `npm run check` | REQUIRED | REQUIRED | command output or CI link |
| `npm audit --audit-level=high` | REQUIRED | REQUIRED | command output or CI link |
| Workspace migration tests | REQUIRED | OPTIONAL | test output |
| Backup protection tests | REQUIRED | OPTIONAL | test output |
| PIN lock tests | REQUIRED | OPTIONAL | test output |
| Production build | REQUIRED | OPTIONAL | build log |
| Windows package smoke build | REQUIRED | NOT REQUIRED | `package:win` output |
| CI workflow pass on final SHA | REQUIRED | REQUIRED | GitHub Actions run |

## Manual Platform Checks

| Behavior | Required Host | Status | Evidence |
|---|---|---|---|
| Existing desktop data migrates to canonical workspace file | Windows | NOT RUN | video or screenshots |
| Corrupt workspace enters recovery mode | Windows | NOT RUN | video or screenshots |
| App no longer silently resets to demo data | Windows | NOT RUN | video or screenshots |
| PIN setup on first enable | Windows | NOT RUN | screenshots |
| PIN unlock after restart | Windows | NOT RUN | screenshots |
| PIN change flow | Windows | NOT RUN | screenshots |
| Wrong PIN rejection | Windows | NOT RUN | screenshots |
| Protected backup export | Windows | NOT RUN | screenshots |
| Protected backup import with correct passphrase | Windows | NOT RUN | screenshots |
| Protected backup import with wrong passphrase fails safely | Windows | NOT RUN | screenshots |
| Month-close snapshot remains stable after migration | Windows | NOT RUN | screenshots |
| Web dev preview still works with demo data | macOS | NOT RUN | screenshot |
| Docs match implemented storage and support boundaries | macOS | NOT RUN | review notes |

## Regression Coverage

- 工作区迁移不改变 `stores`、`employees`、`assignments`、`adjustments`、`ruleHistory`、`monthlyRecords` 语义。
- 月结关闭与解锁历史不回退。
- 已离职员工排除逻辑不回退。
- 调店、历史归属、工资导出、自动恢复点不回退。
- 设置页的备份、恢复、重置演示工作区入口不崩溃。
- 顶栏保存状态与实际异步保存结果一致。
- Web 开发预览继续使用演示数据和浏览器存储，不依赖桌面 API。

## Known Limitations

- 若 canonical workspace file 首版未加密，需要在最终文档中明确列为已知限制。
- 应用锁不能替代操作系统账户隔离。
- 自动恢复点不能替代异地备份。
- macOS 不提供首发商用桌面行为承诺。
- 若 PIN 忘记后无正式找回机制，需要在最终文档中明确表述。
