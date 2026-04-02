import express from 'express';
import cors from 'cors';
import path from 'path';
import 'dotenv/config';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import crypto from 'crypto';

// Load Firebase configuration
let firebaseConfig: any = {};
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');

if (fs.existsSync(configPath)) {
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} else {
  // Fallback to environment variables if file is missing (useful for Render/CI)
  firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || '(default)',
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    appId: process.env.FIREBASE_APP_ID,
  };
}

// Initialize Firebase Admin
const projectIdFromConfig = firebaseConfig.projectId || process.env.GOOGLE_CLOUD_PROJECT;
const databaseIdFromConfig = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)' ? firebaseConfig.firestoreDatabaseId : undefined;

let adminApp;
if (getApps().length > 0) {
  adminApp = getApp();
  console.log('Using existing Firebase Admin app. Project:', adminApp.options.projectId || '(auto-detected)');
} else {
  console.log('Initializing Firebase Admin. Config Project:', projectIdFromConfig || '(auto-detected)');
  
  // If we have a service account key in env, use it. Otherwise, use ADC.
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccount) {
    try {
      const serviceAccountJson = JSON.parse(serviceAccount);
      adminApp = initializeApp({
        credential: cert(serviceAccountJson),
        projectId: projectIdFromConfig,
      });
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT env var. Falling back to default initialization.');
      adminApp = initializeApp({ projectId: projectIdFromConfig });
    }
  } else {
    try {
      adminApp = initializeApp({
        projectId: projectIdFromConfig,
      });
      console.log('Initialized Firebase Admin with ADC. Project:', projectIdFromConfig || '(auto-detected)');
    } catch (e: any) {
      console.error('CRITICAL: Failed to initialize Firebase Admin. This usually means credentials are missing.');
      console.error('On Render, you MUST provide the FIREBASE_SERVICE_ACCOUNT environment variable.');
      console.error('Error Details:', e.message);
      // We still try to proceed, but Firestore operations will likely fail with "Could not load default credentials"
      adminApp = getApps().length > 0 ? getApp() : initializeApp({ projectId: projectIdFromConfig });
    }
  }
}

// Create a firestore instance. We'll wrap it to handle potential database ID mismatches.
let firestoreDb = getFirestore(adminApp, databaseIdFromConfig);
const authAdmin = getAuth(adminApp);

// Test the connection and fallback if needed
(async () => {
  try {
    console.log('Testing Firestore connection to database:', databaseIdFromConfig || '(default)');
    await firestoreDb.collection('_health_check').limit(1).get();
    console.log('Firestore connection successful.');
  } catch (error: any) {
    if (error.code === 7 || error.message.includes('PERMISSION_DENIED') || error.message.includes('not found')) {
      console.warn('Firestore connection failed with database ID from config. Falling back to default database.');
      firestoreDb = getFirestore(adminApp);
    } else if (error.message.includes('Could not load the default credentials')) {
      console.error('CRITICAL: Firestore could not load credentials on the server.');
      console.error('ACTION REQUIRED: Go to Firebase Console -> Project Settings -> Service Accounts -> Generate New Private Key.');
      console.error('Then, add the JSON content to your Render environment variable: FIREBASE_SERVICE_ACCOUNT');
    } else {
      console.error('Firestore connection test failed:', error.message);
    }
  }
})();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  console.log("Starting server with Project:", projectIdFromConfig || '(auto-detected)', "Database:", databaseIdFromConfig || '(default)');

  app.use(cors());
  app.use(express.json());

  // --- "Super-Open" CORS for External API ---
  app.use('/api/external', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-api-key');
    
    // Handle Pre-flight OPTIONS requests
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // --- API Endpoints ---

  // 1. Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Helper for capturing entities
  const captureEntity = async (req: express.Request, res: express.Response, forcedType?: string) => {
    const apiKey = req.headers['x-api-key'];
    const expectedKey = process.env.CHATBOT_API_KEY || 'thinkstack_secret_123';

    if (!apiKey || apiKey !== expectedKey) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    const { type: bodyType, title, notes, priority, userEmail, clientName, relatedTitles, ...rest } = req.method === 'GET' ? req.query : req.body;
    const type = forcedType || bodyType;

    if (!type || !title) {
      return res.status(400).json({ error: 'Missing required fields: type and title' });
    }

    try {
      let targetUid = '';
      const emailLower = (userEmail as string).toLowerCase().trim();
      
      if (userEmail) {
        try {
          // Use Firestore lookup instead of authAdmin.getUserByEmail to avoid Identity Toolkit API dependency
          const userSnap = await firestoreDb.collection('users')
            .where('email', '==', emailLower)
            .limit(1)
            .get();
          
          if (!userSnap.empty) {
            targetUid = userSnap.docs[0].id;
          }
        } catch (e: any) {
          console.warn('User lookup failed, falling back to public inbox:', e.message);
        }
      } else {
        return res.status(400).json({ error: 'userEmail is required to map the entity' });
      }

      const entityId = crypto.randomUUID();
      const now = new Date().toISOString();

      // Smart Mapping for AI Agents (Only if user found)
      let additionalData: any = {};
      if (targetUid) {
        // 1. Map clientName to clientId
        if (clientName && (type === 'task' || type === 'job')) {
          const clientSnap = await firestoreDb.collection('entities')
            .where('uid', '==', targetUid)
            .where('type', '==', 'client')
            .where('title', '==', clientName)
            .limit(1)
            .get();
          
          if (!clientSnap.empty) {
            additionalData.clientId = clientSnap.docs[0].id;
          }
        }

        // 2. Map relatedTitles to relatedIds (Works for ALL types)
        if (relatedTitles && Array.isArray(relatedTitles)) {
          const relatedIds: string[] = [];
          for (const rTitle of relatedTitles) {
            const rSnap = await firestoreDb.collection('entities')
              .where('uid', '==', targetUid)
              .where('title', '==', rTitle)
              .limit(1)
              .get();
            if (!rSnap.empty) {
              relatedIds.push(rSnap.docs[0].id);
            }
          }
          if (relatedIds.length > 0) {
            // Merge with any existing relatedIds in rest
            const existingIds = rest.relatedIds || [];
            additionalData.relatedIds = Array.from(new Set([...existingIds, ...relatedIds]));
          }
        }
      }

      const newEntity = {
        id: entityId,
        type,
        title,
        notes: notes || '',
        priority: priority || 'Medium',
        createdAt: now,
        updatedAt: now,
        userEmail: emailLower,
        ...additionalData,
        ...rest
      };

      // Set default status based on type if not provided
      if (!newEntity.status) {
        if (type === 'task') newEntity.status = 'Todo';
        if (type === 'job') newEntity.status = 'Apply';
        if (type === 'client') newEntity.status = 'Active';
      }

      // Write to Firestore
      if (targetUid) {
        await firestoreDb.collection('entities').doc(entityId).set({
          ...newEntity,
          uid: targetUid
        });
        res.status(201).json({ 
          message: `${type.charAt(0).toUpperCase() + type.slice(1)} captured successfully`, 
          id: entityId,
          status: 'captured'
        });
      } else {
        // Save to public inbox for later sweep when user registers
        await firestoreDb.collection('public_inbox').doc(entityId).set(newEntity);
        res.status(201).json({ 
          message: `User ${userEmail} not yet registered. Task saved to Public Inbox and will be synced upon login.`, 
          id: entityId,
          status: 'inbox'
        });
      }
    } catch (error: any) {
      console.error('Capture Error:', error);
      res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  };

  // 2. Capture Endpoints (Support both POST and GET for bot convenience)
  app.all('/api/external/capture', (req, res) => captureEntity(req, res));
  app.all('/api/external/capture/task', (req, res) => captureEntity(req, res, 'task'));
  app.all('/api/external/capture/job', (req, res) => captureEntity(req, res, 'job'));
  app.all('/api/external/capture/client', (req, res) => captureEntity(req, res, 'client'));
  app.all('/api/external/capture/knowledge', (req, res) => captureEntity(req, res, 'knowledge'));

  // Alias routes for bot convenience (root level)
  app.all('/capture/task', (req, res) => captureEntity(req, res, 'task'));
  app.all('/capture/job', (req, res) => captureEntity(req, res, 'job'));
  app.all('/capture/client', (req, res) => captureEntity(req, res, 'client'));
  app.all('/capture/knowledge', (req, res) => captureEntity(req, res, 'knowledge'));

  // Helper for fetching entities
  const fetchEntities = async (req: express.Request, res: express.Response) => {
    const apiKey = req.headers['x-api-key'];
    const expectedKey = process.env.CHATBOT_API_KEY || 'thinkstack_secret_123';

    if (!apiKey || apiKey !== expectedKey) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    const { userEmail, type } = req.query;

    if (!userEmail) {
      return res.status(400).json({ error: 'Missing required query parameter: userEmail' });
    }

    try {
      const emailLower = (userEmail as string).toLowerCase().trim();
      const userSnap = await firestoreDb.collection('users')
        .where('email', '==', emailLower)
        .limit(1)
        .get();
      
      if (userSnap.empty) {
        return res.status(404).json({ error: `User with email ${userEmail} not found in vault.` });
      }
      
      const uid = userSnap.docs[0].id;

      let query = firestoreDb.collection('entities').where('uid', '==', uid);
      
      if (type) {
        query = query.where('type', '==', type);
      }

      const snapshot = await query.orderBy('createdAt', 'desc').get();
      const entities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      res.json({ entities });
    } catch (error: any) {
      console.error('Fetch Entities Error:', error);
      res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  };

  // 3. Fetch Entities Endpoint
  app.get('/api/external/entities', (req, res) => fetchEntities(req, res));
  app.get('/entities', (req, res) => fetchEntities(req, res));

  // 4. Individual Entity Endpoints (GET, PUT, DELETE)
  app.get('/api/external/entities/:id', async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    const expectedKey = process.env.CHATBOT_API_KEY || 'thinkstack_secret_123';

    if (!apiKey || apiKey !== expectedKey) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    const { id } = req.params;

    try {
      const doc = await firestoreDb.collection('entities').doc(id).get();
      if (!doc.exists) {
        return res.status(404).json({ error: 'Entity not found' });
      }
      res.json({ id: doc.id, ...doc.data() });
    } catch (error: any) {
      res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  });

  app.put('/api/external/entities/:id', async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    const expectedKey = process.env.CHATBOT_API_KEY || 'thinkstack_secret_123';

    if (!apiKey || apiKey !== expectedKey) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    const { id } = req.params;
    const updates = req.body;

    try {
      const docRef = firestoreDb.collection('entities').doc(id);
      const doc = await docRef.get();
      if (!doc.exists) {
        return res.status(404).json({ error: 'Entity not found' });
      }

      const now = new Date().toISOString();
      await docRef.update({
        ...updates,
        updatedAt: now
      });

      res.json({ message: 'Entity updated successfully', id });
    } catch (error: any) {
      res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  });

  app.delete('/api/external/entities/:id', async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    const expectedKey = process.env.CHATBOT_API_KEY || 'thinkstack_secret_123';

    if (!apiKey || apiKey !== expectedKey) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    const { id } = req.params;

    try {
      const docRef = firestoreDb.collection('entities').doc(id);
      const doc = await docRef.get();
      if (!doc.exists) {
        return res.status(404).json({ error: 'Entity not found' });
      }

      await docRef.delete();
      res.json({ message: 'Entity deleted successfully', id });
    } catch (error: any) {
      res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  });

  // 5. Verify API Key
  app.get('/api/external/verify', async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    const expectedKey = process.env.CHATBOT_API_KEY || 'thinkstack_secret_123';

    if (!apiKey || apiKey !== expectedKey) {
      return res.status(401).json({ authorized: false });
    }

    res.json({ authorized: true, message: 'API Key is valid' });
  });

  // 6. User Lookup (for Developer Portal)
  app.get('/api/external/user-lookup', async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    const expectedKey = process.env.CHATBOT_API_KEY || 'thinkstack_secret_123';

    if (!apiKey || apiKey !== expectedKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email required' });

    try {
      const emailLower = (email as string).toLowerCase().trim();
      const userSnap = await firestoreDb.collection('users')
        .where('email', '==', emailLower)
        .limit(1)
        .get();
      
      if (!userSnap.empty) {
        const userData = userSnap.docs[0].data();
        res.json({ 
          exists: true, 
          status: 'registered',
          uid: userSnap.docs[0].id, 
          email: userData.email,
          displayName: userData.displayName,
          debug: { projectId: firebaseConfig.projectId, databaseId: firebaseConfig.firestoreDatabaseId }
        });
      } else {
        // Check public inbox
        const inboxSnap = await firestoreDb.collection('public_inbox')
          .where('userEmail', '==', emailLower)
          .limit(1)
          .get();
        
        if (!inboxSnap.empty) {
          res.json({ 
            exists: true, 
            status: 'inbox',
            message: 'User not registered, but tasks found in Public Inbox.',
            debug: { projectId: firebaseConfig.projectId, databaseId: firebaseConfig.firestoreDatabaseId }
          });
        } else {
          res.json({ 
            exists: false,
            debug: { projectId: projectIdFromConfig, databaseId: databaseIdFromConfig || '(default)' }
          });
        }
      }
    } catch (error: any) {
      console.error('User Lookup Error:', error);
      res.status(500).json({ 
        error: error.message,
        details: error.code || 'No error code',
        debug: { 
          projectId: projectIdFromConfig, 
          databaseId: databaseIdFromConfig || '(default)',
          envProject: process.env.GOOGLE_CLOUD_PROJECT,
          appProjectId: adminApp.options.projectId || '(auto-detected)'
        }
      });
    }
  });

  // 7. Catch-all for API routes to ensure JSON response
  app.all('/api/external/*all', (req, res) => {
    res.status(404).json({ error: `Endpoint ${req.path} not found. Check your URL.` });
  });

  // --- Vite / Static Files ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
