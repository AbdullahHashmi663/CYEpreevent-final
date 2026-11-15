import Image from "next/image";

export default function ThankYouExperience() {
  return <main className="thank-you-page">
    <div className="thank-you-orbit thank-you-orbit-one" aria-hidden="true" />
    <div className="thank-you-orbit thank-you-orbit-two" aria-hidden="true" />
    <section className="thank-you-content" aria-labelledby="thank-you-title">
      <Image
        src="/brand/cye-emblem.png"
        unoptimized
        alt="Capital Youth Expo Pre-Event at BUIC"
        width={92}
        height={92}
        priority
      />
      <p className="thank-you-eyebrow">Capital Youth Expo Pre-Event at BUIC</p>
      <div className="thank-you-mark" aria-hidden="true">✦</div>
      <h1 id="thank-you-title">Thank you<br /><span>for being part of it.</span></h1>
      <p className="thank-you-message">The CYE Pre-Event at Bahria University Islamabad has come to a close. Thank you to every participant, speaker, partner, volunteer, and visitor who brought their energy, ideas, and ambition to the day.</p>
      <p className="thank-you-signoff">The conversations continue. Keep building what comes next.</p>
      <div className="thank-you-line" aria-hidden="true"><span /><span /><span /></div>
      <p className="thank-you-footer">Capital Youth Expo · Engage · Encourage · Empower</p>
    </section>
  </main>;
}
