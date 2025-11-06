const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3000; // يمكنك اختيار أي منفذ تريده

// تفعيل CORS للسماح بالطلبات من الواجهة الأمامية
app.use(cors());

// إعداد مجلد مؤقت لتخزين الملفات المرفوعة
const upload = multer({ dest: 'uploads/' });

// إنشاء نقطة النهاية (endpoint) لضغط الملفات
// سيستمع هذا المسار لطلبات POST القادمة من تطبيق Angular
app.post('/api/compress', upload.single('file'), (req, res) => {
  // التأكد من أنه تم رفع ملف
  if (!req.file) {
    return res.status(400).send('لم يتم رفع أي ملف.');
  }

  const inputPath = req.file.path;
  const outputPath = `compressed-${req.file.filename}.pdf`;

  // هذا هو أمر Ghostscript الأساسي للضغط
  // -dPDFSETTINGS=/ebook يوفر توازنًا جيدًا بين الحجم والجودة
  const command = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile=${outputPath} ${inputPath}`;

  // تنفيذ الأمر
  exec(command, (error) => {
    // الخطوة 1: حذف الملف الأصلي الذي تم رفعه دائمًا
    fs.unlink(inputPath, (err) => {
      if (err) console.error('خطأ في حذف الملف الأصلي:', err);
    });

    // إذا حدث خطأ أثناء الضغط
    if (error) {
      console.error(`خطأ في تنفيذ Ghostscript: ${error.message}`);
      return res.status(500).send('فشل ضغط ملف PDF.');
    }

    // الخطوة 2: إرسال الملف المضغوط مرة أخرى إلى المتصفح
    res.sendFile(path.resolve(outputPath), (err) => {
      if (err) {
        console.error('خطأ في إرسال الملف:', err);
      }
      
      // الخطوة 3: حذف الملف المضغوط من الخادم بعد إرساله
      fs.unlink(outputPath, (unlinkErr) => {
        if (unlinkErr) console.error('خطأ في حذف الملف المضغوط:', unlinkErr);
      });
    });
  });
});

// تشغيل الخادم
app.listen(port, () => {
  console.log(`خادم ضغط PDF يعمل الآن على http://localhost:${port}`);
});