import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import multer from 'multer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from parent directory .env
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const app = express()
const PORT = process.env.PORT || 5000

// Middlewares
app.use(cors())
app.use(express.json())

// Initialize Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Supabase credentials are missing in .env file!')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Configure Multer for secure memory-based uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
})

// ==========================================
// 1. PROJECTS ENDPOINTS
// ==========================================

// Get all projects
app.get('/api/projects', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json(data || [])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get single project by slug
app.get('/api/projects/:slug', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('slug', req.params.slug)
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(404).json({ error: 'Project not found' })
  }
})

// Create new project
app.post('/api/projects', async (req, res) => {
  try {
    const { error, data } = await supabase
      .from('projects')
      .insert([req.body])
      .select()

    if (error) throw error
    res.status(201).json(data?.[0] || { success: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Update existing project
app.put('/api/projects/:id', async (req, res) => {
  try {
    const { error, data } = await supabase
      .from('projects')
      .update(req.body)
      .eq('id', req.params.id)
      .select()

    if (error) throw error
    res.json(data?.[0] || { success: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Delete project
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', req.params.id)

    if (error) throw error
    res.json({ success: true, message: 'Project deleted successfully' })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ==========================================
// 2. INQUIRIES ENDPOINTS
// ==========================================

// Get all inquiries (with related project details)
app.get('/api/inquiries', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('inquiries')
      .select('*, projects(title)')
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json(data || [])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Submit a new inquiry
app.post('/api/inquiries', async (req, res) => {
  try {
    const { error, data } = await supabase
      .from('inquiries')
      .insert([req.body])
      .select()

    if (error) throw error
    res.status(201).json(data?.[0] || { success: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Mark inquiry read status
app.put('/api/inquiries/:id', async (req, res) => {
  try {
    const { error, data } = await supabase
      .from('inquiries')
      .update(req.body)
      .eq('id', req.params.id)
      .select()

    if (error) throw error
    res.json(data?.[0] || { success: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Delete inquiry
app.delete('/api/inquiries/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('inquiries')
      .delete()
      .eq('id', req.params.id)

    if (error) throw error
    res.json({ success: true, message: 'Inquiry deleted successfully' })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ==========================================
// 3. IMAGE UPLOAD ENDPOINT
// ==========================================
app.post('/api/upload', upload.array('files'), async (req, res) => {
  try {
    const files = req.files
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files were uploaded.' })
    }

    const publicUrls = []
    for (const file of files) {
      const fileExt = file.originalname.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
      const filePath = `project-images/${fileName}`

      const { data, error } = await supabase.storage
        .from('project-images')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          duplex: 'half'
        })

      if (error) throw error

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('project-images')
        .getPublicUrl(filePath)

      publicUrls.push(publicUrl)
    }

    res.json({ urls: publicUrls })
  } catch (err) {
    console.error('Storage Upload Error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Start Server
app.listen(PORT, () => {
  console.log(`Aurum Estates API Server running on http://localhost:${PORT}`)
})
