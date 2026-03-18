-- Add columns
ALTER TABLE ai_knowledge_base
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'document',
  ADD COLUMN IF NOT EXISTS word_count integer;

-- Seed initial knowledge
INSERT INTO ai_knowledge_base (title, content, category, source_type)
VALUES
(
  'Andy Andrews Coaching Philosophy',
  'Movement quality before load. Never sacrifice form for weight. Consistency beats intensity every time. A mediocre session done consistently beats a perfect session done occasionally. Sleep and recovery are training — not optional extras. The body adapts during rest, not during the session. Hand portions over calorie counting for sustainable nutrition. NTU system for measuring training load across movement patterns. Readiness drives intensity — check in daily and adjust accordingly. The audit score drives everything — know your baseline before prescribing anything.',
  'Training',
  'note'
),
(
  'Matthew Walker Sleep Protocol',
  'Sleep is the single most effective thing you can do for your brain and body. 7-9 hours for adults. Consistent sleep and wake times even on weekends. Cool room temperature (65-68F / 18-20C). Avoid alcohol — it fragments sleep architecture. Avoid caffeine after 2pm. Morning light exposure within 30 minutes of waking. Evening light reduction after sunset. Sleep debt is real and cumulative. REM sleep is critical for performance and learning consolidation.',
  'Sleep',
  'note'
),
(
  'Huberman Performance Protocols',
  'Morning sunlight for 10-30 minutes within first hour of waking — sets circadian rhythm. Delay caffeine 90-120 minutes after waking to avoid afternoon crash. Cold exposure for dopamine and norepinephrine — cold shower or ice bath. Non-sleep deep rest (NSDR) / yoga nidra for recovery between sessions. Breathing protocols for stress management. Zone 2 cardio for metabolic health. Deliberate heat exposure for growth hormone.',
  'Lifestyle',
  'note'
),
(
  'Precision Nutrition Hand Portions',
  'Protein: 1-2 palm-sized portions per meal for women, 2 palms for men. Vegetables: 1-2 fist-sized portions per meal. Carbohydrates: 1 cupped hand per meal for women, 2 for men. Fats: 1 thumb-sized portion per meal for women, 2 for men. Adjust based on goals — reduce carbs for fat loss, increase for muscle gain. Eat slowly, stop at 80% full. Protein at every meal non-negotiable.',
  'Nutrition',
  'note'
)
ON CONFLICT DO NOTHING;