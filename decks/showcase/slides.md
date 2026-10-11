<!-- .slide: class="cover" data-title="好的想法，值得一个好开场" -->

<div class="cover-copy">
  <p class="eyebrow">01 / THE OPENING</p>
  <h1>好的想法，<br>值得一个<br><em>好开场。</em></h1>
  <p class="muted">用代码构建演示，让表达有自己的风格。</p>
  <div class="cover-meta"><span>YOUR NAME</span><span>2026.10</span><span>FRAME / 演示工作台</span></div>
</div>
<div class="orbital-art" aria-hidden="true"></div>

Note:
这是组件样板的封面。替换标题、作者和日期，就能开始一场新的技术分享。

---

<!-- .slide: data-title="这套演示的四种表达" -->

<p class="eyebrow">02 / THE OUTLINE</p>

## 这套演示的四种表达

<div class="agenda">
  <div class="agenda-row"><span class="agenda-index">01</span><strong class="agenda-title">一句话，建立主题</strong><span class="agenda-note">封面 / 章节 / 双栏</span></div>
  <div class="agenda-row"><span class="agenda-index">02</span><strong class="agenda-title">代码里，找到细节</strong><span class="agenda-note">语法高亮 / 逐行讲解</span></div>
  <div class="agenda-row"><span class="agenda-index">03</span><strong class="agenda-title">结构中，看见逻辑</strong><span class="agenda-note">公式 / 架构 / 数据</span></div>
  <div class="agenda-row"><span class="agenda-index">04</span><strong class="agenda-title">变化时，保持连贯</strong><span class="agenda-note">连续动画 / 收尾</span></div>
</div>

Note:
这里的每一页都可以复制到自己的演示里。先选合适的版式，再替换内容。

---

<!-- .slide: class="chapter" data-title="01 一页，一个重点" -->

<p class="eyebrow">THE FIRST PRINCIPLE</p>
<div class="chapter-number" aria-hidden="true">01</div>
<h2>一页，<br>一个重点。</h2>
<p>把注意力留给真正需要被记住的内容。</p>

Note:
章节页用来切换话题，也给听众短暂的停顿。大数字只承担章节编号的作用。

---

<!-- .slide: data-title="讲清楚一次编译" -->

<p class="eyebrow">03 / TWO COLUMNS</p>

## 讲清楚一次编译

<div class="two-col">
  <div>
    <p class="label">听众已经知道</p>
    <p class="statement">我们写下<br><span class="accent">人能读懂</span>的程序。</p>
    <p class="muted">变量、函数和循环，表达计算的意图。</p>
  </div>
  <div>
    <p class="label">这一页要说明</p>
    <p class="statement">编译器生成<br><span class="accent">机器能执行</span>的指令。</p>
    <p class="muted">中间表示承接转换，也为优化提供结构。</p>
  </div>
</div>
<p class="caption">内容示例：用听众熟悉的概念，解释一个新的过程。</p>

Note:
这是简化的编译流程说明。真实工具链还会涉及目标文件、链接等步骤，可以按分享主题增加后续页面。

---

<!-- .slide: class="code-slide" data-title="代码，也有讲述顺序" -->

<p class="eyebrow">04 / CODE WALKTHROUGH</p>

## 代码，也有讲述顺序

```cpp [1-3|5-8]
float sum(const float* x, int n) {
  float result = 0.0f;
  // 一个顺序求和的示例

  for (int i = 0; i < n; ++i) {
    result += x[i];
  }
  return result;
}
```

<p class="fragment caption">先看输入与初值，再跟随循环观察每一次累加。</p>

Note:
前进一次会切换代码高亮行，再前进会出现下方说明。这是展示代码分步讲解的示例，不包含性能结论。

---

<!-- .slide: data-title="公式连接直觉与定义" -->

<p class="eyebrow">05 / MATH & MEANING</p>

## 公式连接直觉与定义

<div class="equation">

$$
y = \sum_{i=0}^{n-1} x_i
$$

</div>

<div class="two-col">
  <div><p class="label">一个小例子</p><p class="statement">[2, 4, 6, 8] <span class="accent">→ 20</span></p></div>
  <div><p class="label">对应上一页的代码</p><p class="muted">每次循环读取一个元素，<br>并把它加到累计值中。</p></div>
</div>

Note:
公式通过 KaTeX 渲染，源码仍是可编辑的 LaTeX。浮点运算的舍入行为不等同于精确实数运算，此页只用于解释求和的数学含义。

---

<!-- .slide: data-title="编译流程，一眼看清" -->

<p class="eyebrow">06 / ARCHITECTURE</p>

## 编译流程，一眼看清

<p class="muted">沿着数据的流向，逐步展开系统。</p>

<div class="pipeline">
  <div class="pipeline-node"><span class="label">01 / INPUT</span><strong>源程序</strong><small>描述计算意图</small></div>
  <span class="pipeline-arrow" aria-hidden="true">→</span>
  <div class="pipeline-node"><span class="label">02 / TRANSFORM</span><strong>中间表示</strong><small>分析与优化</small></div>
  <span class="pipeline-arrow" aria-hidden="true">→</span>
  <div class="pipeline-node"><span class="label">03 / OUTPUT</span><strong>目标代码</strong><small>匹配目标架构</small></div>
</div>

<p class="caption">简化的架构示例。节点与说明均可直接编辑。</p>

Note:
这里用原生 HTML 展示流程，适合直接修改节点名称、数量和说明。实际项目可以把节点改成自己的模块。

---

<!-- .slide: data-title="数字需要清楚的参照" -->

<p class="eyebrow">07 / DATA & CONTEXT</p>

## 数字需要清楚的参照

<p class="demo-label">演示数据 · 非实测结果</p>

<div class="two-col">
  <div class="metric-grid">
    <div class="metric"><strong class="metric-value">62.5<span>%</span></strong><p class="metric-label">示例耗时降幅</p></div>
    <p class="caption">计算方式：(32 − 12) / 32</p>
  </div>
  <div class="bar-chart" role="img" aria-label="演示数据：基线耗时 32 毫秒，优化后 12 毫秒，耗时降幅 62.5%。">
    <div class="bar-row"><div class="bar-label"><span>基线</span><strong>32 ms</strong></div><div class="bar-track"><div class="bar" style="--value: 100%;"></div></div></div>
    <div class="bar-row"><div class="bar-label"><span>优化后</span><strong>12 ms</strong></div><div class="bar-track"><div class="bar accent" style="--value: 37.5%;"></div></div></div>
    <p class="caption">耗时 / ms · 越短越好</p>
  </div>
</div>

Note:
这些数字仅用于演示数据版式，不代表任何真实系统的性能。正式演示应补充测试环境、输入规模、统计方法与数据来源。

---

<!-- .slide: data-auto-animate data-auto-animate-id="compile-flow" data-title="连续动画：建立上下文" -->

<p class="eyebrow">08 / AUTO ANIMATE</p>

<h2 data-id="flow-title">一个过程，两个视角</h2>
<p class="muted" data-id="flow-description">先看完整流程，再聚焦其中一步。</p>

<div class="flow-stage" style="display: flex; gap: 24px; align-items: stretch;">
  <div class="flow-box" data-id="flow-a" style="flex: 1; padding: 36px;"><span class="label">01</span><strong>源程序</strong><p>表达意图</p></div>
  <div class="flow-box" data-id="flow-b" style="flex: 1; padding: 36px;"><span class="label">02</span><strong>中间表示</strong><p>分析与优化</p></div>
  <div class="flow-box" data-id="flow-c" style="flex: 1; padding: 36px;"><span class="label">03</span><strong>目标代码</strong><p>匹配架构</p></div>
</div>

<p class="caption">继续翻页，观察中间节点的变化。</p>

Note:
这两页通过相同的 data-id 关联元素，Reveal.js 会自动计算它们的位置和尺寸变化。

---

<!-- .slide: data-auto-animate data-auto-animate-id="compile-flow" data-title="连续动画：聚焦中间表示" -->

<p class="eyebrow">08 / AUTO ANIMATE</p>

<h2 data-id="flow-title">现在，聚焦中间表示</h2>
<p class="muted" data-id="flow-description">保留前后关系，把更多空间留给当前重点。</p>

<div class="flow-stage" style="display: flex; gap: 24px; align-items: stretch;">
  <div class="flow-box" data-id="flow-a" style="flex: 0.65; padding: 36px; opacity: 0.45;"><span class="label">01</span><strong>源程序</strong><p>表达意图</p></div>
  <div class="flow-box flow-focus" data-id="flow-b" style="flex: 1.7; padding: 36px;"><span class="label">02</span><strong>中间表示</strong><p>分析与优化</p><p class="flow-caption">在明确的语义和约束下，<br>逐步转换程序结构。</p></div>
  <div class="flow-box" data-id="flow-c" style="flex: 0.65; padding: 36px; opacity: 0.45;"><span class="label">03</span><strong>目标代码</strong><p>匹配架构</p></div>
</div>

Note:
第二页放大中间节点，降低两侧节点的视觉权重。正式演示可在这里展开一个具体 Pass 或 IR 变换。

---

<!-- .slide: class="closing" data-title="下一场，讲你的故事" -->

<p class="eyebrow">09 / YOUR NEXT DECK</p>

<h2>下一场，<br>讲<span class="accent">你的故事。</span></h2>

<p class="muted">留下一个清楚的结论。<br>把时间交给讨论。</p>

<div class="cover-meta"><span>YOUR NAME</span><span>Q & A</span><span>FRAME / 演示工作台</span></div>

Note:
结尾可以替换为核心结论、联系方式或下一步行动。演讲者备注只在演讲者视图中显示。
