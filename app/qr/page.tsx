import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export default async function QRPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://your-project.vercel.app";
  const qrSvg = await QRCode.toString(siteUrl, {
    type: "svg",
    width: 360,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  return (
    <main className="qrPage">
      <section className="qrPoster">
        <div className="logoMark large">C</div>
        <p className="eyebrow">CVP LAUNDRY</p>
        <h1>เช็กสถานะเครื่องซักผ้า</h1>
        <p>สแกน QR เดียว ดูได้ครบทั้ง 4 เครื่อง</p>
        <div className="qrBox" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        <strong>สแกนเพื่อดูเวลาที่เหลือ</strong>
        <small>{siteUrl}</small>
      </section>
    </main>
  );
}
