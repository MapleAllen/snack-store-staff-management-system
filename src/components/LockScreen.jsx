import { useState } from "react";

export function LockScreen({ onUnlock }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await window.payrollDesktop.unlock(pin);
      setPin("");
      onUnlock();
    } catch (err) {
      setError(err?.code === "lock:pin-attempt-limited" ? "尝试次数过多，请等待 30 秒" : "PIN 不正确，请重试");
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  function handlePinInput(value) {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 6) setPin(digits);
  }

  return (
    <div className="lock-screen">
      <div className="lock-screen__card">
        <img className="lock-screen__logo" src="/app-icon.svg" alt="" />
        <h1>门店工资助手</h1>
        <p>请输入 PIN 解锁</p>
        <form className="lock-screen__form" onSubmit={handleSubmit}>
          <div className="lock-screen__pin-display">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className={i < pin.length ? "lock-screen__dot lock-screen__dot--filled" : "lock-screen__dot"} />
            ))}
          </div>
          <input
            className="lock-screen__input"
            type="password"
            inputMode="numeric"
            autoFocus
            maxLength={6}
            value={pin}
            onChange={(e) => handlePinInput(e.target.value)}
            disabled={busy}
          />
          {error ? <p className="lock-screen__error">{error}</p> : null}
          <button className="primary-button" type="submit" disabled={pin.length < 4 || busy}>
            {busy ? "验证中…" : "解锁"}
          </button>
        </form>
      </div>
    </div>
  );
}
