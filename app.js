const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const {v4: uuidv4} = require('uuid');
const {PDFDocument} = require('pdf-lib');
const moment = require('moment');
const morgan = require('morgan');
const app = express();
const PORT = 5000;

// Morgan'ı kullan
app.use(morgan('combined'));

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
        const fileType = path.extname(file.originalname).toLowerCase();
        console.log(`File type: ${fileType}, Original name: ${file.originalname}, Mimetype: ${file.mimetype}`);

        if (fileType === '.pdf') {
            cb(null, true);
        } else {
            console.log('File rejected: Only .pdf files are allowed.');
            cb(new Error('Only .pdf files are allowed!'), false);
        }
    }
}).single('file');

app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Dosya yükleme ve sıkıştırma
app.post('/upload', (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.log(`Error during file upload: ${err.message}`);
            return res.status(500).send({
                status: false,
                message: 'Failed to upload file',
                error: err.message,
                date: moment().format('YYYY-MM-DD HH:mm:ss')
            });
        }

        if (!req.file) {
            console.log('No file uploaded or file type is not PDF.');
            return res.status(404).send({
                status: false,
                message: 'Only .pdf files are allowed!',
                date: moment().format('YYYY-MM-DD HH:mm:ss')
            });
        }

        try {
            console.log(`File uploaded successfully: ${req.file.filename}`);
            const inputPath = path.join(__dirname, 'uploads', req.file.filename);
            const outputPath = path.join(__dirname, 'uploads', `compressed_${req.file.filename}`);

            await compressPDF(inputPath, outputPath);

            fs.unlinkSync(inputPath);

            res.status(200).send({
                status: true,
                filename: path.basename(outputPath),
                date: moment().format('YYYY-MM-DD HH:mm:ss')
            });
        } catch (error) {
            console.log(`Error during PDF compression: ${error.message}`);
            res.status(500).send({
                message: 'Failed to compress PDF',
                error: error.message,
                status: false,
                date: moment().format('YYYY-MM-DD HH:mm:ss')
            });
        }
    });
});

// Dosya indirme
app.get('/download/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.params.filename);
    res.download(filePath);
});

// Dosya listeleme
app.get('/files', (req, res) => {
    fs.readdir(path.join(__dirname, 'uploads'), (err, files) => {
        if (err) {
            return res.status(500).send({
                message: 'Failed to list files',
                status: false,
                date: moment().format('YYYY-MM-DD HH:mm:ss')
            });
        }
        res.send(files);
    });
});

// Dosya silme
app.delete('/delete/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.params.filename);
    fs.unlink(filePath, (err) => {
        if (err) {
            return res.status(500).send({
                message: 'Failed to delete file',
                status: false,
                date: moment().format('YYYY-MM-DD HH:mm:ss')
            });
        }
        res.send({
            message: 'File deleted successfully',
            status: true,
            date: moment().format('YYYY-MM-DD HH:mm:ss')
        });
    });
});

// PDF görüntüleme
app.get('/view/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.params.filename);

    // Dosyanın varlığını kontrol et
    if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/pdf');
        fs.createReadStream(filePath).pipe(res);
    } else {
        res.status(404).send({
            message: 'File not found',
            status: false,
            date: moment().format('YYYY-MM-DD HH:mm:ss')
        });
    }
});

// Dosya sıkıştırma
async function compressPDF(inputPath, outputPath) {
    const pdfDoc = await PDFDocument.load(fs.readFileSync(inputPath));
    const compressedPdfBytes = await pdfDoc.save({useObjectStreams: false});

    fs.writeFileSync(outputPath, compressedPdfBytes);
}

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
