// src/controllers/teacherController.ts
import { Request, Response } from 'express';
import { db } from '../config/db';

export const getAllTeachers = async (req: Request, res: Response) => {
  try {
    // Simplification du tri pour éviter l'erreur d'index manquant dans Firestore
    const snapshot = await db.collection('teachers').orderBy('last_name').get();
    const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Tri secondaire côté client ou serveur si nécessaire (ici on laisse le client gérer potentiellement)
    
    res.json(rows);
  } catch (error: any) {
    console.error('Erreur getAllTeachers:', error);
    res.status(500).json({ 
      message: "Erreur lors de la récupération des enseignants.",
      error: error.message,
      stack: error.stack
    });
  }
};

export const getTeacherById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const docRef = await db.collection('teachers').doc(id).get();
    
    if (!docRef.exists) {
      return res.status(404).json({ message: "Enseignant non trouvé." });
    }
    
    res.json({ id: docRef.id, ...docRef.data() });
  } catch (error) {
    console.error('Erreur getTeacherById:', error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

export const createTeacher = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, department, phone } = req.body; // Added phone
    
    if (!firstName || !lastName) {
        return res.status(400).json({ message: "Le nom et le prénom sont obligatoires." });
    }

    const newTeacher = {
        first_name: firstName,
        last_name: lastName,
        email: email || null,
        department: department || null,
        phone: phone || null,
        created_at: new Date()
    };

    const docRef = await db.collection('teachers').add(newTeacher);

    res.status(201).json({ 
        message: "Enseignant ajouté.",
        id: docRef.id,
        teacher: { id: docRef.id, ...newTeacher }
    });
  } catch (error) {
    console.error('Erreur createTeacher:', error);
    res.status(500).json({ message: "Erreur lors de l'ajout." });
  }
};

export const updateTeacher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, department, status, phone } = req.body;

    const updateData: any = {};
    if (firstName) updateData.first_name = firstName;
    if (lastName) updateData.last_name = lastName;
    if (email !== undefined) updateData.email = email;
    if (department !== undefined) updateData.department = department;
    if (status !== undefined) updateData.status = status;
    if (phone !== undefined) updateData.phone = phone;

    await db.collection('teachers').doc(id).update(updateData);

    res.json({ message: "Enseignant mis à jour.", id, ...updateData });
  } catch (error) {
    console.error('Erreur updateTeacher:', error);
    res.status(500).json({ message: "Erreur lors de la mise à jour." });
  }
};

export const deleteTeacher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.collection('teachers').doc(id).delete();
    res.json({ message: "Enseignant supprimé." });
  } catch (error) {
    console.error('Erreur deleteTeacher:', error);
    res.status(500).json({ message: "Erreur lors de la suppression." });
  }
};
