const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const {v4: uuidv4} = require('uuid');

const app = express();
const PORT = 3000;

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, uuidv4() + path.extname(file.originalname));
    }
});

const upload = multer({storage: storage});

app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Dosya yükleme
app.post('/upload', upload.single('file'), (req, res) => {
    res.send({filename: req.file.filename});
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
            return res.status(500).json({message: 'Failed to list files'});
        }
        res.json(files);
    });
});

// Dosya silme
app.delete('/delete/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.params.filename);
    fs.unlink(filePath, (err) => {
        if (err) {
            return res.status(500).json({message: 'Failed to delete file'});
        }
        res.json({message: 'File deleted successfully'});
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
