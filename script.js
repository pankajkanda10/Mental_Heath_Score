// ---- Settings ----
const API_URL   = "https://mental-heath-score-4.onrender.com/predict";
const MAX_SCORE = 10;   // top of your model's score scale (affects the gauge only)
// ------------------

const $ = id => document.getElementById(id);
const radio = name => document.querySelector(`input[name="${name}"]:checked`).value;
$("maxLabel").textContent = MAX_SCORE;

// platform chips
const platforms = ["Instagram","Facebook","TikTok","YouTube","Twitter","Snapchat","LinkedIn","WhatsApp","WeChat","LINE","KakaoTalk","VKontakte"];
$("platforms").innerHTML = platforms.map((p, i) =>
  `<label class="chip"><input type="radio" name="most_used_platform" value="${p}" ${i === 0 ? "checked" : ""}><span>${p}</span></label>`).join("");

// sliders: live value + filled track
document.querySelectorAll("input[type=range]").forEach(r => {
  const out = r.closest("div").querySelector("output");
  const update = () => {
    out.innerHTML = `${r.value} <small>hrs</small>`;
    r.style.setProperty("--p", (r.value - r.min) / (r.max - r.min) * 100 + "%");
  };
  r.addEventListener("input", update); update();
});

const colorFor = p => p >= 0.7 ? "var(--high)" : p >= 0.45 ? "var(--mid)" : "var(--low)";
const labelFor = p => p >= 0.7 ? "Looking healthy" : p >= 0.45 ? "Room to improve" : "Needs attention";
const adviceFor = p => p >= 0.7
  ? "These habits point to relatively good mental health."
  : p >= 0.45
  ? "Some inputs, like stress, sleep or screen time, may be pulling the score down."
  : "Sleep, stress and screen time may be worth a closer look.";

function setGauge(score) {
  const p = Math.max(0, Math.min(1, score / MAX_SCORE));
  const fill = $("gaugeFill");
  fill.style.strokeDashoffset = 100 - p * 100;
  fill.style.stroke = colorFor(p);
  fill.style.color = colorFor(p);
  return p;
}

function countUp(to) {
  const el = $("score"), start = performance.now(), dur = 900;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = to.toFixed(1); return; }
  (function tick(now) {
    const t = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - t, 3);
    el.textContent = (to * e).toFixed(1);
    if (t < 1) requestAnimationFrame(tick);
  })(start);
}

function showError(text) {
  $("message").textContent = text;
  $("message").classList.add("error");
  $("score").textContent = "–";
  $("badge").textContent = "No result";
  setGauge(0);
}

$("form").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = $("submitBtn"), msg = $("message");
  msg.classList.remove("error");

  const payload = {
    age: parseInt($("age").value, 10),
    gender: radio("gender"),
    country: $("country").value.trim(),
    academic_level: radio("academic_level"),
    most_used_platform: radio("most_used_platform"),
    purpose_of_use: radio("purpose_of_use"),
    avg_daily_usage_hours: parseFloat($("avg_daily_usage_hours").value),
    daily_unlocks: parseInt($("daily_unlocks").value, 10),
    study_hours: parseFloat($("study_hours").value),
    physical_activity_hours: parseFloat($("physical_activity_hours").value),
    sleep_hours_per_night: parseFloat($("sleep_hours_per_night").value),
    stress_level: radio("stress_level")
  };

  if (!payload.country || isNaN(payload.age) || isNaN(payload.daily_unlocks))
    return showError("Fill in age, country and phone unlocks, then try again.");

  btn.disabled = true; btn.textContent = "Predicting…";
  try {
    const res = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) {
      let detail = `The server returned an error (${res.status}). Check the FastAPI terminal for details.`;
      try {
        const err = await res.json();
        if (Array.isArray(err.detail)) detail = err.detail.map(d => d.loc.slice(1).join(".") + ": " + d.msg).join("; ");
      } catch (_) {}
      return showError(detail);
    }
    const score = (await res.json()).predicted_mental_health_score;
    const p = setGauge(score);
    countUp(score);
    $("badge").textContent = labelFor(p);
    $("badge").style.color = colorFor(p);
    msg.textContent = adviceFor(p);
  } catch (err) {
    showError("Can't reach the backend. Make sure FastAPI is running at " + API_URL.replace("/predict", "") + ".");
  } finally {
    btn.disabled = false; btn.textContent = "Predict mental health score";
  }
});
