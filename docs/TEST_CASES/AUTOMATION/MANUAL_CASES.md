# 暂无法充分自动化的用例清单

> 生成时间：2026-08-14T15:46:31.404Z
> 共 **35** 条（全量 6913）

这些用例在当前基建下无法用稳定断言替代，需人工或专用实验室环境。已尽量把策略/判定表部分拆到 AUTO_UNIT。

## 按原因汇总

### 视听主观验收（音效听感/动画观感）无法用断言替代（15）

- BB-06279 [DRAW-特效音效/相位-intro] 相位-intro-相位长按加速
- BB-06284 [DRAW-特效音效/相位-charge] 相位-charge-相位长按加速
- BB-06289 [DRAW-特效音效/相位-reveal] 相位-reveal-相位长按加速
- BB-06294 [DRAW-特效音效/相位-ceremony] 相位-ceremony-相位长按加速
- BB-06299 [DRAW-特效音效/相位-finale] 相位-finale-相位长按加速
- BB-06304 [DRAW-特效音效/相位-summary] 相位-summary-相位长按加速
- BB-06307 [DRAW-特效音效/设置正交组合] settings-anim=true,sound=true,particles=true
- BB-06308 [DRAW-特效音效/设置正交组合] settings-anim=true,sound=true,particles=false
- BB-06309 [DRAW-特效音效/设置正交组合] settings-anim=true,sound=false,particles=true
- BB-06310 [DRAW-特效音效/设置正交组合] settings-anim=true,sound=false,particles=false
- BB-06311 [DRAW-特效音效/设置正交组合] settings-anim=false,sound=true,particles=true
- BB-06312 [DRAW-特效音效/设置正交组合] settings-anim=false,sound=true,particles=false
- BB-06313 [DRAW-特效音效/设置正交组合] settings-anim=false,sound=false,particles=true
- BB-06314 [DRAW-特效音效/设置正交组合] settings-anim=false,sound=false,particles=false
- BB-06714 [DRAW-MP-E2E/单抽全特效] e2e-单抽全特效

### 性能/体感指标需设备与基准环境，暂无统一自动化阈值门禁（11）

- BB-06618 [PERF-性能/开盒动画性能] 开盒动画性能-单抽流畅度
- BB-06619 [PERF-性能/开盒动画性能] 开盒动画性能-10连流畅度
- BB-06621 [PERF-性能/开盒动画性能] 开盒动画性能-终极特效峰值
- BB-06628 [PERF-性能/开盒动画性能] 开盒动画性能-预取不影响滚动
- BB-06629 [PERF-性能/开盒动画性能] 开盒动画性能-市集列表首屏
- BB-06632 [PERF-性能/开盒动画性能] 开盒动画性能-库存并发压测
- BB-06633 [PERF-性能/接口与网关压测] 接口与网关压测-下单接口吞吐
- BB-06634 [PERF-性能/接口与网关压测] 接口与网关压测-支付回调洪峰
- BB-06635 [PERF-性能/接口与网关压测] 接口与网关压测-市集抢购
- BB-06636 [PERF-性能/接口与网关压测] 接口与网关压测-幂等键冲突
- BB-06637 [PERF-性能/接口与网关压测] 接口与网关压测-管理端发货批量

### 未能可靠映射到现有自动化层（8）

- BB-06620 [PERF-性能/开盒动画性能] 开盒动画性能-20连批处理
- BB-06623 [PERF-性能/开盒动画性能] 开盒动画性能-跳过释放资源
- BB-06624 [PERF-性能/开盒动画性能] 开盒动画性能-连续开5单
- BB-06625 [PERF-性能/开盒动画性能] 开盒动画性能-SSE长连接
- BB-06626 [PERF-性能/开盒动画性能] 开盒动画性能-弱网开盒
- BB-06627 [PERF-性能/开盒动画性能] 开盒动画性能-冷启动到可开盒
- BB-06630 [PERF-性能/开盒动画性能] 开盒动画性能-市集聊天SSE
- BB-06631 [PERF-性能/开盒动画性能] 开盒动画性能-对账Job耗时

### 依赖真实支付证书/生产通道，沙箱无法完整替代（1）

- BB-06651 [SEC-安全/开盒链路安全] 开盒链路安全-mockPay生产开启

