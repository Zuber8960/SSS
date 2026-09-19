const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const BusinessPartnerController = require('./businessPartner.controller');

// ── BP document upload (stored under backend/uploads/bp-docs, served via /app/public/bp-doc-file/...) ──
const BP_DOC_DIR = path.join(__dirname, '..', '..', 'uploads', 'bp-docs');
fs.mkdirSync(BP_DOC_DIR, { recursive: true });

const bpDocStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, BP_DOC_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || "") || ".pdf";
        cb(null, `bpdoc_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`);
    },
});

const BP_DOC_MIME = [
    "image/jpeg", "image/png", "image/jpg", "image/gif",
    "image/heic", "image/heif", "application/pdf",
    "", // Android/mobile captures can send an empty mimetype
];
const bpDocUpload = multer({
    storage: bpDocStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (req, file, cb) => {
        if (BP_DOC_MIME.includes(file.mimetype)) cb(null, true);
        else cb(new Error(`File type not supported: ${file.mimetype || "unknown"} (${file.originalname || "unnamed"})`));
    },
});

// Upload BP document → returns { url: "/uploads/bp-docs/<filename>" }
router.post('/documents', (req, res) => {
    bpDocUpload.single('file')(req, res, (err) => {
        if (err) {
            const isSize = err.code === 'LIMIT_FILE_SIZE';
            return res.status(isSize ? 413 : 400).json({
                success: false,
                message: isSize ? 'File too large (max 10MB)' : err.message,
            });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No document file received' });
        }
        res.status(201).json({ success: true, data: { url: `/uploads/bp-docs/${req.file.filename}` } });
    });
});

router.get('/types', async (req, res) => {
    try {
        const data = await BusinessPartnerController.getAllBpTypes();
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('BP Types error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving BP types' });
    }
});

router.get('/byBpName/:bpName', async (req, res) => {
    try {
        const { tenant_id } = req;
        const { loc_code } = req.query;
        const data = await BusinessPartnerController.getBusinessPartnerByBpName(
            req.params.bpName,
            loc_code || null,
            tenant_id.toString()
        );
        if (!data) return res.status(404).json({ success: false, message: 'Business partner not found' });
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('BP by BP Name error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving business partner' });
    }
});

router.get('/byPanName/:panName', async (req, res) => {
    try {
        const { tenant_id } = req;
        const data = await BusinessPartnerController.getBusinessPartnerByPanName(
            req.params.panName,
            tenant_id.toString()
        );
        if (!data) return res.status(404).json({ success: false, message: 'Business partner not found' });
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('BP by PAN Name error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving business partner' });
    }
});

router.get('/', async (req, res) => {
    try {
        const { tenant_id } = req;
        const data = await BusinessPartnerController.getAllBusinessPartnerData(tenant_id.toString());
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Business Partner error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving business partner data' });
    }
});

router.get('/:recId', async (req, res) => {
    try {
        const data = await BusinessPartnerController.getBusinessPartnerDataByRecId(req.params.recId);
        if (!data) return res.status(404).json({ success: false, message: 'Business partner not found' });
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Business Partner error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving business partner' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { tenant_id } = req;
        const userId = req.user?.recId;
        const data = await BusinessPartnerController.saveBusinessPartnerData(userId, { ...req.body, tenant_id });
        res.status(201).json({ success: true, data });
    } catch (error) {
        console.error('Business Partner error:', error);
        res.status(500).json({ success: false, message: 'Error saving business partner data' });
    }
});

router.put('/:recId', async (req, res) => {
    try {
        const { tenant_id } = req;
        const data = await BusinessPartnerController.updateBusinessPartnerData({ recId: req.params.recId, tenant_id }, req.body);
        if (!data || data.length === 0) {
            return res.status(404).json({ success: false, message: 'Business partner not found' });
        }
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Business Partner error:', error);
        res.status(500).json({ success: false, message: 'Error updating business partner data' });
    }
});

router.delete('/:recId', async (req, res) => {
    try {
        const deletedCount = await BusinessPartnerController.deleteBusinessPartnerData(req.params.recId);
        if (!deletedCount) {
            return res.status(404).json({ success: false, message: 'Business partner not found' });
        }
        res.status(200).json({ success: true, message: 'Business partner deleted successfully' });
    } catch (error) {
        console.error('Business Partner error:', error);
        res.status(500).json({ success: false, message: 'Error deleting business partner data' });
    }
});

module.exports = router;
