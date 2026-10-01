import * as THREE from "three";

const CHAT_MIN_GAP = 14;
const CHAT_DURATION = 4.2;
const CHAT_RANGE = 2.1;
const LINES = ["💬", "🎶", "😄", "🌻", "🍲"];

export function createSocialLayer(container) {
  const projector = new THREE.Vector3();
  const cooldowns = new Map();
  let chats = [];

  function tick(villagers, elapsed) {
    cooldowns.forEach((until, id) => {
      if (elapsed > until) cooldowns.delete(id);
    });
    if (chats.length) return;
    const idle = villagers.filter(
      (member) =>
        !member.isBusy?.() &&
        !member.isIndoors?.() &&
        !cooldowns.has(member.getId()) &&
        member.root?.visible !== false,
    );
    for (let i = 0; i < idle.length; i += 1) {
      for (let j = i + 1; j < idle.length; j += 1) {
        const a = idle[i];
        const b = idle[j];
        if (a.root.position.distanceTo(b.root.position) > CHAT_RANGE) continue;
        const until = elapsed + CHAT_DURATION;
        a.pauseRoam?.(CHAT_DURATION + 0.6, b.root.position);
        b.pauseRoam?.(CHAT_DURATION + 0.6, a.root.position);
        chats.push({
          a,
          b,
          until,
          phase: 0,
          els: [a, b].map((member) => {
            const el = document.createElement("div");
            el.className = "chat-bubble";
            el.textContent = LINES[Math.floor(Math.random() * LINES.length)];
            container?.appendChild(el);
            return el;
          }),
        });
        cooldowns.set(a.getId(), until + CHAT_MIN_GAP);
        cooldowns.set(b.getId(), until + CHAT_MIN_GAP);
        return;
      }
    }
  }

  function update(delta, elapsed, villagers, camera, view) {
    if (!container) return;
    tick(villagers, elapsed);
    chats = chats.filter((chat) => {
      if (elapsed > chat.until || view === "valley") {
        chat.els.forEach((el) => el.remove());
        return false;
      }
      chat.phase += delta;
      const members = [chat.a, chat.b];
      chat.els.forEach((el, i) => {
        const member = members[i];
        if (!member?.root) {
          el.hidden = true;
          return;
        }
        projector.copy(member.root.position);
        projector.y += 2.55;
        projector.project(camera);
        if (projector.z > 1) {
          el.hidden = true;
          return;
        }
        el.hidden = false;
        el.style.left = `${(projector.x * 0.5 + 0.5) * window.innerWidth}px`;
        el.style.top = `${(-projector.y * 0.5 + 0.5) * window.innerHeight}px`;
        const speaker = Math.floor(chat.phase / 1.4) % 2;
        el.classList.toggle("is-muted", i !== speaker);
      });
      return true;
    });
  }

  return { update };
}
