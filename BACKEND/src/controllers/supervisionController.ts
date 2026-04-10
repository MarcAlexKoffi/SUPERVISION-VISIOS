
import { Request, Response } from 'express';
import { db } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

export const createSupervision = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      teacherName, module, level, sessionNumber, date, startTime, endTime, platform,
      teacherId, ueId, // Nouveaux champs optionnels
      presentCount, totalStudents,
      technical, pedagogical,
      observations, supervisorName,
      supervisorSignature, teacherSignature
    } = req.body;

    // Validation basique (on garde la validation existante pour ne rien casser)
    if (!teacherName || !module || !date) {
        return res.status(400).json({ message: 'Les champs nom enseignant, module et date sont obligatoires.' });
    }

    const newSupervision = {
        user_id: userId,
        teacher_name: teacherName,
        module, level, session_number: sessionNumber, 
        visit_date: date, // stored as string YYYY-MM-DD usually? or keep consistent date obj
        start_time: startTime, end_time: endTime, platform,
        teacher_id: teacherId || null,
        ue_id: ueId || null,
        present_count: presentCount, total_students: totalStudents,
        tech_internet: technical?.internet,
        tech_audio_video: technical?.audioVideo,
        tech_punctuality: technical?.punctuality,
        ped_objectives: pedagogical?.objectives,
        ped_content_mastery: pedagogical?.contentMastery,
        ped_interaction: pedagogical?.interaction,
        ped_tools_usage: pedagogical?.toolsUsage,
        observations, supervisor_name: supervisorName,
        supervisor_signature: supervisorSignature,
        teacher_signature: teacherSignature,
        created_at: new Date()
    };

    const docRef = await db.collection('supervisions').add(newSupervision);

    res.status(201).json({ 
      message: 'Fiche de supervision enregistrée avec succès.',
      id: docRef.id 
    });

  } catch (error) {
    console.error('Erreur createSupervision:', error);
    res.status(500).json({ message: 'Erreur lors de l\'enregistrement de la fiche.' });
  }
};

export const getAllSupervisions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const limitParam = parseInt(req.query.limit as string) || 300; // Protège la RAM Node.js
    
    let query: FirebaseFirestore.Query = db.collection('supervisions');

    // If not admin, only show own supervisions
    if (userRole !== 'admin') {
        query = query.where('user_id', '==', userId);
    }
    
    // Sort needs index manually created for combinations. 
    // Fallback to simpler query + in-memory sort or user must create index in Firebase Console
    try {
        query = query.orderBy('visit_date', 'desc');
    } catch (e) {
         console.warn("Sorting skipped or failed, check Firestore Indexes");
    }

    query = query.limit(limitParam); // Exécution de la limite

    const snapshot = await query.get();
    
    let supervisions = snapshot.docs.map(doc => {
       const data = doc.data(); 
       return {
            id: doc.id,
            ...data,
            // Mocked joins to prevent breaking frontend
            creator_username: 'Chargement...', 
            ue_real_name: data.module, 
            teacher_firstname: '',
            teacher_lastname: data.teacher_name
        };
    });

    res.json(supervisions);
  } catch (error) {
    console.error('Erreur getAllSupervisions:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des fiches.' });
  }
};

export const getSupervisionById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const docRef = await db.collection('supervisions').doc(id).get();
    
    if (!docRef.exists) return res.status(404).json({ message: "Non trouvée" });
    
    const data = docRef.data();
    
    // Check perm
    if (req.user?.role !== 'admin' && data?.user_id !== req.user?.id) {
        return res.status(403).json({ message: "Non autorisé" });
    }

    res.json({ id: docRef.id, ...data });
  } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
  }
};

export const updateSupervision = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const userRole = req.user?.role;
        
        const docRef = db.collection('supervisions').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) return res.status(404).json({ message: 'Fiche non trouvée.' });
        
        const data = doc.data();
        if (userRole !== 'admin' && data?.user_id !== userId) {
            return res.status(403).json({ message: 'Non autorisé à modifier cette fiche.' });
        }

        const {
          teacherName, module, level, sessionNumber, date, startTime, endTime, platform,
          teacherId, ueId,
          presentCount, totalStudents,
          technical, pedagogical,
          observations, supervisorName,
          supervisorSignature, teacherSignature
        } = req.body;
    
        const updateData: any = {};
        if (teacherName) updateData.teacher_name = teacherName;
        if (module) updateData.module = module;
        if (level) updateData.level = level;
        if (sessionNumber) updateData.session_number = sessionNumber;
        if (date) updateData.visit_date = date;
        if (startTime) updateData.start_time = startTime;
        if (endTime) updateData.end_time = endTime;
        if (platform) updateData.platform = platform;
        if (teacherId !== undefined) updateData.teacher_id = teacherId;
        if (ueId !== undefined) updateData.ue_id = ueId;
        if (presentCount !== undefined) updateData.present_count = presentCount;
        if (totalStudents !== undefined) updateData.total_students = totalStudents;
        
        if (technical) {
            if (technical.internet !== undefined) updateData.tech_internet = technical.internet;
            if (technical.audioVideo !== undefined) updateData.tech_audio_video = technical.audioVideo;
            if (technical.punctuality !== undefined) updateData.tech_punctuality = technical.punctuality;
        }

        if (pedagogical) {
             if (pedagogical.objectives !== undefined) updateData.ped_objectives = pedagogical.objectives;
             if (pedagogical.contentMastery !== undefined) updateData.ped_content_mastery = pedagogical.contentMastery;
             if (pedagogical.interaction !== undefined) updateData.ped_interaction = pedagogical.interaction;
             if (pedagogical.toolsUsage !== undefined) updateData.ped_tools_usage = pedagogical.toolsUsage;
        }

        if (observations !== undefined) updateData.observations = observations;
        if (supervisorName) updateData.supervisor_name = supervisorName;
        // Signatures usually not updated but if needed:
        if (supervisorSignature !== undefined) updateData.supervisor_signature = supervisorSignature;
        if (teacherSignature !== undefined) updateData.teacher_signature = teacherSignature;

        await docRef.update(updateData);
    
        res.json({ message: 'Fiche mise à jour avec succès.', id });
    } catch (error) {
        console.error('Erreur updateSupervision:', error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour.' });
    }
};

export const deleteSupervision = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const docRef = db.collection('supervisions').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return res.status(404).json({ message: 'Fiche non trouvée.' });

    const data = doc.data();
    if (userRole !== 'admin' && data?.user_id !== userId) {
        return res.status(403).json({ message: 'Non autorisé à supprimer cette fiche.' });
    }
    
    await docRef.delete();

    res.json({ message: 'Fiche supprimée.' });
  } catch (error) {
    console.error('Erreur deleteSupervision:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression.' });
  }
};

import { sendEmail } from '../utils/emailService';

export const sendSupervisionReport = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { pdfBase64, teacherEmail, subject, message } = req.body;

    if (!pdfBase64 || !teacherEmail) {
      return res.status(400).json({ message: 'Le PDF et l\'email du destinataire sont requis.' });
    }

    // Decode base64
    const buffer = Buffer.from(pdfBase64, 'base64');

    await sendEmail(
      teacherEmail,
      subject || 'Rapport de Supervision',
      message || 'Veuillez trouver ci-joint le rapport de votre supervision.',
      `
      <h3>Rapport de Supervision</h3>
      <p>${message || 'Veuillez trouver ci-joint le rapport de votre supervision.'}</p>
      <hr>
      <small>Ceci est un message automatique, merci de ne pas y répondre.</small>
      `,
      [
        {
          filename: `Rapport-Supervision-${id}.pdf`,
          content: buffer,
          contentType: 'application/pdf'
        }
      ]
    );

    res.json({ message: 'Rapport envoyé par email avec succès.' });
  } catch (error: any) {
    console.error('Erreur sendSupervisionReport:', error);
    res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'email.', error: error.message });
  }
};
