# CVP Laundry v1.7 update

แก้ปัญหาสถานะ `finished` ค้างและไม่กลับเป็น `available` เมื่อไม่มี ESP32 ส่ง event `available`.

- หลังสถานะ `finished` ครบ 10 นาที ระบบจะเปลี่ยนเป็น `available` อัตโนมัติเมื่อหน้าเว็บ/API `/api/machines` มีการ refresh.
- หน้า Dashboard refresh ทุก 5 วินาทีอยู่แล้ว จึงไม่ต้องตั้ง Cron เพิ่ม.
- ถ้า ESP32 ส่ง `available` มาก่อน 10 นาที ระบบยังทำงานตาม event นั้นตามปกติ.
- เครื่องที่ Admin ตั้ง `is_maintenance=true` จะไม่ถูก auto-release.

อัปเดตไฟล์ในโปรเจกต์เดิม แล้วรัน `npm run build`, commit และ push ขึ้น GitHub/Vercel.
