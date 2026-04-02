
import { Entity } from '../types';
import { db, auth, collection, doc, setDoc, getDocs, query, where, orderBy, deleteDoc, updateDoc, handleFirestoreError, OperationType } from '../firebase';

/**
 * ThinkStack Persistent Storage - V3 (Firebase Firestore)
 * Uses Firebase Firestore to persist data for each user.
 */

const COLLECTION_NAME = 'entities';

export const storage = {
  saveEntities: async (entities: Entity[]) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('User not authenticated');

      const batch = entities.map(entity => {
        const docRef = doc(db, COLLECTION_NAME, entity.id);
        return setDoc(docRef, { ...entity, uid });
      });
      
      await Promise.all(batch);
      return { success: true, count: entities.length };
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, COLLECTION_NAME);
    }
  },
  
  loadEntities: async (): Promise<Entity[]> => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return [];

      const q = query(
        collection(db, COLLECTION_NAME),
        where('uid', '==', uid),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as Entity);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, COLLECTION_NAME);
      return [];
    }
  },

  addEntity: async (entity: Entity) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('User not authenticated');

      const docRef = doc(db, COLLECTION_NAME, entity.id);
      await setDoc(docRef, { ...entity, uid });
      return entity;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, COLLECTION_NAME);
    }
  },

  updateEntity: async (entity: Entity) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('User not authenticated');

      const docRef = doc(db, COLLECTION_NAME, entity.id);
      await updateDoc(docRef, { ...entity, uid });
      return entity;
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, COLLECTION_NAME);
    }
  },

  deleteEntity: async (id: string) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, COLLECTION_NAME);
    }
  },

  clear: () => {
    console.warn('Clear operation not implemented for Firestore in V3');
  }
};
