const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const {v4: uuidv4} = require('uuid');
const {PDFDocument} = require('pdf-lib');
const moment = require('moment');
const app = express();
const PORT = 3000;

// 'uploads' klasörünün varlığını kontrol et ve yoksa oluştur
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Dosya adı oluşturma
function generateFileName() {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-T:\.Z]/g, '');
    return `${uuidv4()}_${timestamp}.pdf`;
}

// Multer ayarları
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, generateFileName());
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname).toLowerCase() === '.pdf') {
            cb(null, true);
        } else {
            cb(null, false); // Hata durumunu yönetmek için false dönüyoruz
        }
    }
}).single('file');

app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Dosya yükleme ve sıkıştırma
app.post('/upload', (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: 'Failed to upload file', error: err.message,
                date: moment().format('YYYY-MM-DD HH:mm:ss')
            });
        }

        if (!req.file) {
            return res.status(404).json({
                status: false,
                message: 'Only .pdf files are allowed!',
                date: moment().format('YYYY-MM-DD HH:mm:ss')
            });
        }

        try {
            const inputPath = path.join(__dirname, 'uploads', req.file.filename);
            const outputPath = path.join(__dirname, 'uploads', `compressed_${req.file.filename}`);

            await compressPDF(inputPath, outputPath);

            // Orijinal dosyayı silme (isteğe bağlı)
            fs.unlinkSync(inputPath);

            res.status(200).send({
                status: true,
                filename: path.basename(outputPath),
                date: moment().format('YYYY-MM-DD HH:mm:ss')
            });
        } catch (error) {
            res.status(500).json({message: 'Failed to compress PDF', error: error.message});
        }
    });
});

// Dosya sıkıştırma
async function compressPDF(inputPath, outputPath) {
    const pdfDoc = await PDFDocument.load(fs.readFileSync(inputPath));
    const compressedPdfBytes = await pdfDoc.save({useObjectStreams: false});

    fs.writeFileSync(outputPath, compressedPdfBytes);
}

// Diğer endpointler...

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
