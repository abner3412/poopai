const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const upload = multer({ dest: 'uploads/' });

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Add this route handler for the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/analyze', upload.single('image'), async (req, res) => {
  console.log('API Key:', process.env.OPENAI_API_KEY);
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    console.log('File received:', req.file);

    const imageBuffer = fs.readFileSync(req.file.path);
    const base64Image = imageBuffer.toString('base64');
    console.log('Base64 image length:', base64Image.length);

    const payload = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'You are a stool appearance analyst, not a medical professional. Describe the visual characteristics of the stool in this image, focusing on color, consistency, and shape. Then, based solely on appearance, state whether it looks "visually normal" or "visually unusual". Remember, this is not medical advice, just a visual observation.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 300
    };
    console.log('OpenAI API payload:', JSON.stringify(payload, null, 2));

    const openaiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );

    const analysis = openaiResponse.data.choices[0].message.content;

    res.json({ analysis });
  } catch (error) {
    console.error('Error details:', error.message);
    if (error.response) {
      console.error('OpenAI API response:', error.response.data);
    }
    res.status(500).json({ error: 'An error occurred while processing the image' });
  } finally {
    // Clean up the uploaded file
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

