// src/App.jsx (CORRIGIDO)
import React, { useState, useEffect, useMemo } from "react";

// CORREÇÃO: Removido 'ensureAnonLogin' da importação
import { auth, db } from "./firebase";
import {
  signInAnonymously,
  onAuthStateChanged
} from "firebase/auth";

import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  deleteDoc,
  serverTimestamp,
  doc
} from "firebase/firestore";

// =======================================
// CATÁLOGO DE BOBINAS
// (COLE AQUI A SUA LISTA COMPLETA)
// =======================================
const initialInventoryCatalog = [
  { id: '85500', description: 'BOB 2 PERFIL US 45X17X1,50' },
  { id: '85500A', description: 'BOB 2 PERFIL US 45X17X1,80' },
  { id: '85500B', description: 'BOB 2 PERFIL US 45X17X2,00' },
  { id: '85500C', description: 'BOB 2 PERFIL US 45X17X2,25' },
  { id: '85500D', description: 'BOB 2 PERFIL US 45X17X2,65' },
  { id: '85500E', description: 'BOB 2 PERFIL US 45X17X3,00' },
  { id: '855001', description: 'BOB 2 PERFIL US 45X17X4,75' },
  { id: '85501', description: 'BOB 2 PERFIL US 50X25X1,50' },
  { id: '85501A', description: 'BOB 2 PERFIL US 50X25X1,80' },
  { id: '85501B', description: 'BOB 2 PERFIL US 50X25X2,00' },
  { id: '85501C', description: 'BOB 2 PERFIL US 50X25X2,25' },
  { id: '85501D', description: 'BOB 2 PERFIL US 50X25X2,65' },
  { id: '85501E', description: 'BOB 2 PERFIL US 50X25X3,00' },
  { id: '855011', description: 'BOB 2 PERFIL US 50X25X4,75' },
  { id: '85502', description: 'BOB 2 PERFIL US 68X30X1,50' },
  { id: '85502A', description: 'BOB 2 PERFIL US 68X30X1,80' },
  { id: '85502B', description: 'BOB 2 PERFIL US 68X30X2,00' },
  { id: '85502C', description: 'BOB 2 PERFIL US 68X30X2,25' },
  { id: '85502D', description: 'BOB 2 PERFIL US 68X30X2,65' },
  { id: '85502E', description: 'BOB 2 PERFIL US 68X30X3,00' },
  { id: '855021', description: 'BOB 2 PERFIL US 68X30X4,75' },
  { id: '85503', description: 'BOB 2 PERFIL US 75X40X1,50' },
  { id: '85503A', description: 'BOB 2 PERFIL US 75X40X1,80' },
  { id: '85503B', description: 'BOB 2 PERFIL US 75X40X2,00' },
  { id: '85503C', description: 'BOB 2 PERFIL US 75X40X2,25' },
  { id: '85503D', description: 'BOB 2 PERFIL US 75X40X2,65' },
  { id: '85503E', description: 'BOB 2 PERFIL US 75X40X3,00' },
  { id: '855031', description: 'BOB 2 PERFIL US 75X40X4,75' },
  { id: '85504', description: 'BOB 2 PERFIL US 92X30X1,50' },
  { id: '85504A', description: 'BOB 2 PERFIL US 92X30X1,80' },
  { id: '85504B', description: 'BOB 2 PERFIL US 92X30X2,00' },
  { id: '85504C', description: 'BOB 2 PERFIL US 92X30X2,25' },
  { id: '85504D', description: 'BOB 2 PERFIL US 92X30X2,65' },
  { id: '85504E', description: 'BOB 2 PERFIL US 92X30X3,00' },
  { id: '855041', description: 'BOB 2 PERFIL US 92X30X4,75' },
  { id: '85505', description: 'BOB 2 PERFIL US 100X40X1,50' },
  { id: '85505A', description: 'BOB 2 PERFIL US 100X40X1,80' },
  { id: '85505B', description: 'BOB 2 PERFIL US 100X40X2,00' },
  { id: '85505C', description: 'BOB 2 PERFIL US 100X40X2,25' },
  { id: '85505D', description: 'BOB 2 PERFIL US 100X40X2,65' },
  { id: '85505E', description: 'BOB 2 PERFIL US 100X40X3,00' },
  { id: '855051', description: 'BOB 2 PERFIL US 100X40X4,75' },
  { id: '85506', description: 'BOB 2 PERFIL US 100X50X1,50' },
  { id: '85506A', description: 'BOB 2 PERFIL US 100X50X1,80' },
  { id: '85506B', description: 'BOB 2 PERFIL US 100X50X2,00' },
  { id: '85506C', description: 'BOB 2 PERFIL US 100X50X2,25' },
  { id: '85506D', description: 'BOB 2 PERFIL US 100X50X2,65' },
  { id: '85506E', description: 'BOB 2 PERFIL US 100X50X3,00' },
  { id: '855061', description: 'BOB 2 PERFIL US 100X50X4,75' },
  { id: '85507', description: 'BOB 2 PERFIL US 120X30X1,50' },
  { id: '85507A', description: 'BOB 2 PERFIL US 120X30X1,80' },
  { id: '85507B', description: 'BOB 2 PERFIL US 120X30X2,00' },
  { id: '85507C', description: 'BOB 2 PERFIL US 120X30X2,25' },
  { id: '85507D', description: 'BOB 2 PERFIL US 120X30X2,65' },
  { id: '85507E', description: 'BOB 2 PERFIL US 120X30X3,00' },
  { id: '855071', description: 'BOB 2 PERFIL US 120X30X4,75' },
  { id: '85508', description: 'BOB 2 PERFIL US 120X40X1,50' },
  { id: '85508A', description: 'BOB 2 PERFIL US 120X40X1,80' },
  { id: '85508B', description: 'BOB 2 PERFIL US 120X40X2,00' },
  { id: '85508C', description: 'BOB 2 PERFIL US 120X40X2,25' },
  { id: '85508D', description: 'BOB 2 PERFIL US 120X40X2,65' },
  { id: '85508E', description: 'BOB 2 PERFIL US 120X40X3,00' },
  { id: '855081', description: 'BOB 2 PERFIL US 120X40X4,75' },
  { id: '85509', description: 'BOB 2 PERFIL US 127X40X1,50' },
  { id: '85509A', description: 'BOB 2 PERFIL US 127X40X1,80' },
  { id: '85509B', description: 'BOB 2 PERFIL US 127X40X2,00' },
  { id: '85509C', description: 'BOB 2 PERFIL US 127X40X2,25' },
  { id: '85509D', description: 'BOB 2 PERFIL US 127X40X2,65' },
  { id: '85509E', description: 'BOB 2 PERFIL US 127X40X3,00' },
  { id: '855091', description: 'BOB 2 PERFIL US 127X40X4,75' },
  { id: '85510', description: 'BOB 2 PERFIL US 127X50X1,50' },
  { id: '85510A', description: 'BOB 2 PERFIL US 127X50X1,80' },
  { id: '85510B', description: 'BOB 2 PERFIL US 127X50X2,00' },
  { id: '85510C', description: 'BOB 2 PERFIL US 127X50X2,25' },
  { id: '85510D', description: 'BOB 2 PERFIL US 127X50X2,65' },
  { id: '85510E', description: 'BOB 2 PERFIL US 127X50X3,00' },
  { id: '855101', description: 'BOB 2 PERFIL US 127X50X4,75' },
  { id: '85511', description: 'BOB 2 PERFIL US 140X40X1,50' },
  { id: '85511A', description: 'BOB 2 PERFIL US 140X40X1,80' },
  { id: '85511B', description: 'BOB 2 PERFIL US 140X40X2,00' },
  { id: '85511C', description: 'BOB 2 PERFIL US 140X40X2,25' },
  { id: '85511D', description: 'BOB 2 PERFIL US 140X40X2,65' },
  { id: '85511E', description: 'BOB 2 PERFIL US 140X40X3,00' },
  { id: '855111', description: 'BOB 2 PERFIL US 140X40X4,75' },
  { id: '85512', description: 'BOB 2 PERFIL US 140X50X1,50' },
  { id: '85512A', description: 'BOB 2 PERFIL US 140X50X1,80' },
  { id: '85512B', description: 'BOB 2 PERFIL US 140X50X2,00' },
  { id: '85512C', description: 'BOB 2 PERFIL US 140X50X2,25' },
  { id: '85512D', description: 'BOB 2 PERFIL US 140X50X2,65' },
  { id: '85512E', description: 'BOB 2 PERFIL US 140X50X3,00' },
  { id: '855121', description: 'BOB 2 PERFIL US 140X50X4,75' },
  { id: '85513', description: 'BOB 2 PERFIL US 150X40X1,50' },
  { id: '85513A', description: 'BOB 2 PERFIL US 150X40X1,80' },
  { id: '85513B', description: 'BOB 2 PERFIL US 150X40X2,00' },
  { id: '85513C', description: 'BOB 2 PERFIL US 150X40X2,25' },
  { id: '85513D', description: 'BOB 2 PERFIL US 150X40X2,65' },
  { id: '85513E', description: 'BOB 2 PERFIL US 150X40X3,00' },
  { id: '855131', description: 'BOB 2 PERFIL US 150X40X4,75' },
  { id: '85514', description: 'BOB 2 PERFIL US 150X50X1,50' },
  { id: '85514A', description: 'BOB 2 PERFIL US 150X50X1,80' },
  { id: '85514B', description: 'BOB 2 PERFIL US 150X50X2,00' },
  { id: '85514C', description: 'BOB 2 PERFIL US 150X50X2,25' },
  { id: '85514D', description: 'BOB 2 PERFIL US 150X50X2,65' },
  { id: '85514E', description: 'BOB 2 PERFIL US 150X50X3,00' },
  { id: '855141', description: 'BOB 2 PERFIL US 150X50X4,75' },
  { id: '85515', description: 'BOB 2 PERFIL US 150X60X1,50' },
  { id: '85515A', description: 'BOB 2 PERFIL US 150X60X1,80' },
  { id: '85515B', description: 'BOB 2 PERFIL US 150X60X2,00' },
  { id: '85515C', description: 'BOB 2 PERFIL US 150X60X2,25' },
  { id: '85515D', description: 'BOB 2 PERFIL US 150X60X2,65' },
  { id: '85515E', description: 'BOB 2 PERFIL US 150X60X3,00' },
  { id: '855151', description: 'BOB 2 PERFIL US 150X60X4,75' },
  { id: '85516', description: 'BOB 2 PERFIL US 200X50X1,50' },
  { id: '85516A', description: 'BOB 2 PERFIL US 200X50X1,80' },
  { id: '85516B', description: 'BOB 2 PERFIL US 200X50X2,00' },
  { id: '85516C', description: 'BOB 2 PERFIL US 200X50X2,25' },
  { id: '85516D', description: 'BOB 2 PERFIL US 200X50X2,65' },
  { id: '85516E', description: 'BOB 2 PERFIL US 200X50X3,00' },
  { id: '855161', description: 'BOB 2 PERFIL US 200X50X4,75' },
  { id: '85517', description: 'BOB 2 PERFIL US 200X75X1,50' },
  { id: '85517A', description: 'BOB 2 PERFIL US 200X75X1,80' },
  { id: '85517B', description: 'BOB 2 PERFIL US 200X75X2,00' },
  { id: '85517C', description: 'BOB 2 PERFIL US 200X75X2,25' },
  { id: '85517D', description: 'BOB 2 PERFIL US 200X75X2,65' },
  { id: '85517E', description: 'BOB 2 PERFIL US 200X75X3,00' },
  { id: '855171', description: 'BOB 2 PERFIL US 200X75X4,75' },
  { id: '85518', description: 'BOB 2 PERFIL UE 50X25X10X1,50' },
  { id: '85518A', description: 'BOB 2 PERFIL UE 50X25X10X1,80' },
  { id: '85518B', description: 'BOB 2 PERFIL UE 50X25X10X2,00' },
  { id: '85518C', description: 'BOB 2 PERFIL UE 50X25X10X2,25' },
  { id: '85518D', description: 'BOB 2 PERFIL UE 50X25X10X2,65' },
  { id: '85518E', description: 'BOB 2 PERFIL UE 50X25X10X3,00' },
  { id: '855181', description: 'BOB 2 PERFIL UE 50X25X10X4,75' },
  { id: '85519', description: 'BOB 2 PERFIL UE 75X25X15X1,50' },
  { id: '85519A', description: 'BOB 2 PERFIL UE 75X25X15X1,80' },
  { id: '85519B', description: 'BOB 2 PERFIL UE 75X25X15X2,00' },
  { id: '85519C', description: 'BOB 2 PERFIL UE 75X25X15X2,25' },
  { id: '85519D', description: 'BOB 2 PERFIL UE 75X25X15X2,65' },
  { id: '85519E', description: 'BOB 2 PERFIL UE 75X25X15X3,00' },
  { id: '855191', description: 'BOB 2 PERFIL UE 75X25X15X4,75' },
  { id: '85520', description: 'BOB 2 PERFIL UE 75X40X15X1,50' },
  { id: '85520A', description: 'BOB 2 PERFIL UE 75X40X15X1,80' },
  { id: '85520B', description: 'BOB 2 PERFIL UE 75X40X15X2,00' },
  { id: '85520C', description: 'BOB 2 PERFIL UE 75X40X15X2,25' },
  { id: '85520D', description: 'BOB 2 PERFIL UE 75X40X15X2,65' },
  { id: '85520E', description: 'BOB 2 PERFIL UE 75X40X15X3,00' },
  { id: '855201', description: 'BOB 2 PERFIL UE 75X40X15X4,75' },
  { id: '85521', description: 'BOB 2 PERFIL UE 100X40X17X1,50' },
  { id: '85521A', description: 'BOB 2 PERFIL UE 100X40X17X1,80' },
  { id: '85521B', description: 'BOB 2 PERFIL UE 100X40X17X2,00' },
  { id: '85521C', description: 'BOB 2 PERFIL UE 100X40X17X2,25' },
  { id: '85521D', description: 'BOB 2 PERFIL UE 100X40X17X2,65' },
  { id: '85521E', description: 'BOB 2 PERFIL UE 100X40X17X3,00' },
  { id: '855211', description: 'BOB 2 PERFIL UE 100X40X17X4,75' },
  { id: '85522', description: 'BOB 2 PERFIL UE 100X50X17X1,50' },
  { id: '85522A', description: 'BOB 2 PERFIL UE 100X50X17X1,80' },
  { id: '85522B', description: 'BOB 2 PERFIL UE 100X50X17X2,00' },
  { id: '85522C', description: 'BOB 2 PERFIL UE 100X50X17X2,25' },
  { id: '85522D', description: 'BOB 2 PERFIL UE 100X50X17X2,65' },
  { id: '85522E', description: 'BOB 2 PERFIL UE 100X50X17X3,00' },
  { id: '855221', description: 'BOB 2 PERFIL UE 100X50X17X4,75' },
  { id: '85523', description: 'BOB 2 PERFIL UE 127X25X17X1,50' },
  { id: '85523A', description: 'BOB 2 PERFIL UE 127X25X17X1,80' },
  { id: '85523B', description: 'BOB 2 PERFIL UE 127X25X17X2,00' },
  { id: '85523C', description: 'BOB 2 PERFIL UE 127X25X17X2,25' },
  { id: '85523D', description: 'BOB 2 PERFIL UE 127X25X17X2,65' },
  { id: '85523E', description: 'BOB 2 PERFIL UE 127X25X17X3,00' },
  { id: '855231', description: 'BOB 2 PERFIL UE 127X25X17X4,75' },
  { id: '85524', description: 'BOB 2 PERFIL UE 127X50X17X1,50' },
  { id: '85524A', description: 'BOB 2 PERFIL UE 127X50X17X1,80' },
  { id: '85524B', description: 'BOB 2 PERFIL UE 127X50X17X2,00' },
  { id: '85524C', description: 'BOB 2 PERFIL UE 127X50X17X2,25' },
  { id: '85524D', description: 'BOB 2 PERFIL UE 127X50X17X2,65' },
  { id: '85524E', description: 'BOB 2 PERFIL UE 127X50X17X3,00' },
  { id: '855241', description: 'BOB 2 PERFIL UE 127X50X17X4,75' },
  { id: '85525', description: 'BOB 2 PERFIL UE 150X50X17X1,50' },
  { id: '85525A', description: 'BOB 2 PERFIL UE 150X50X17X1,80' },
  { id: '85525B', description: 'BOB 2 PERFIL UE 150X50X17X2,00' },
  { id: '85525C', description: 'BOB 2 PERFIL UE 150X50X17X2,25' },
  { id: '85525D', description: 'BOB 2 PERFIL UE 150X50X17X2,65' },
  { id: '85525E', description: 'BOB 2 PERFIL UE 150X50X17X3,00' },
  { id: '855251', description: 'BOB 2 PERFIL UE 150X50X17X4,75' },
  { id: '85526', description: 'BOB 2 PERFIL UE 150X60X20X1,50' },
  { id: '85526A', description: 'BOB 2 PERFIL UE 150X60X20X1,80' },
  { id: '85526B', description: 'BOB 2 PERFIL UE 150X60X20X2,00' },
  { id: '85526C', description: 'BOB 2 PERFIL UE 150X60X20X2,25' },
  { id: '85526D', description: 'BOB 2 PERFIL UE 150X60X20X2,65' },
  { id: '85526E', description: 'BOB 2 PERFIL UE 150X60X20X3,00' },
  { id: '855261', description: 'BOB 2 PERFIL UE 150X60X20X4,75' },
  { id: '85527', description: 'BOB 2 PERFIL UE 200X60X20X1,50' },
  { id: '85527A', description: 'BOB 2 PERFIL UE 200X60X20X1,80' },
  { id: '85527B', description: 'BOB 2 PERFIL UE 200X60X20X2,00' },
  { id: '85527C', description: 'BOB 2 PERFIL UE 200X60X20X2,25' },
  { id: '85527D', description: 'BOB 2 PERFIL UE 200X60X20X2,65' },
  { id: '85527E', description: 'BOB 2 PERFIL UE 200X60X20X3,00' },
  { id: '855271', description: 'BOB 2 PERFIL UE 200X60X20X4,75' },
  { id: '85528', description: 'BOB 2 PERFIL UE 200X75X25X1,50' },
  { id: '85528A', description: 'BOB 2 PERFIL UE 200X75X25X1,80' },
  { id: '85528B', description: 'BOB 2 PERFIL UE 200X75X25X2,00' },
  { id: '85528C', description: 'BOB 2 PERFIL UE 200X75X25X2,25' },
  { id: '85528D', description: 'BOB 2 PERFIL UE 200X75X25X2,65' },
  { id: '85528E', description: 'BOB 2 PERFIL UE 200X75X25X3,00' },
  { id: '855281', description: 'BOB 2 PERFIL UE 200X75X25X4,75' },
  { id: '85529', description: 'BOB 2 PERFIL UE 250X75X25X1,50' },
  { id: '85529A', description: 'BOB 2 PERFIL UE 250X75X25X1,80' },
  { id: '85529B', description: 'BOB 2 PERFIL UE 250X75X25X2,00' },
  { id: '85529C', description: 'BOB 2 PERFIL UE 250X75X25X2,25' },
  { id: '85529D', description: 'BOB 2 PERFIL UE 250X75X25X2,65' },
  { id: '85529E', description: 'BOB 2 PERFIL UE 250X75X25X3,00' },
  { id: '855291', description: 'BOB 2 PERFIL UE 250X75X25X4,75' },
  { id: '85530', description: 'BOB 2 PERFIL UE 300X75X25X1,50' },
  { id: '85530A', description: 'BOB 2 PERFIL UE 300X75X25X1,80' },
  { id: '85530B', description: 'BOB 2 PERFIL UE 300X75X25X2,00' },
  { id: '85530C', description: 'BOB 2 PERFIL UE 300X75X25X2,25' },
  { id: '85530D', description: 'BOB 2 PERFIL UE 300X75X25X2,65' },
  { id: '85530E', description: 'BOB 2 PERFIL UE 300X75X25X3,00' },
  { id: '855301', description: 'BOB 2 PERFIL UE 300X75X25X4,75' },
  { id: '85533B', description: 'BOB 2 PERFIL U BANDEJA 127X30X2,00' },
  { id: '85088', description: 'BOB 2 CHAPA RAIADA 0,65MM GALV' },
  { id: '85087', description: 'BOB 2 CHAPA RAIADA 0,50MM GALV' },
  { id: '85531B', description: 'BOB 2 PERFIL U PORTA 25X25X2,00' },
  { id: '85532B', description: 'BOB 2 PERFIL U PORTA 25X32X2,00' },
  { id: '85500J', description: 'BOB 2 PERFIL US 45X17X1,55 GALV' },
  { id: '85501J', description: 'BOB 2 PERFIL US 50X25X1,55 GALV' },
  { id: '85502J', description: 'BOB 2 PERFIL US 68X30X1,55 GALV' },
  { id: '85503J', description: 'BOB 2 PERFIL US 75X40X1,55 GALV' },
  { id: '85504J', description: 'BOB 2 PERFIL US 92X30X1,55 GALV' },
  { id: '85505J', description: 'BOB 2 PERFIL US 100X40X1,55 GALV' },
  { id: '85506J', description: 'BOB 2 PERFIL US 100X50X1,55 GALV' },
  { id: '85507J', description: 'BOB 2 PERFIL US 120X30X1,55 GALV' },
  { id: '85508J', description: 'BOB 2 PERFIL US 120X40X1,55 GALV' },
  { id: '85509J', description: 'BOB 2 PERFIL US 127X40X1,55 GALV' },
  { id: '85510J', description: 'BOB 2 PERFIL US 127X50X1,55 GALV' },
  { id: '85511J', description: 'BOB 2 PERFIL US 140X40X1,55 GALV' },
  { id: '85512J', description: 'BOB 2 PERFIL US 140X50X1,55 GALV' },
  { id: '85513J', description: 'BOB 2 PERFIL US 150X40X1,55 GALV' },
  { id: '85514J', description: 'BOB 2 PERFIL US 150X50X1,55 GALV' },
  { id: '85515J', description: 'BOB 2 PERFIL US 150X60X1,55 GALV' },
  { id: '85516J', description: 'BOB 2 PERFIL US 200X50X1,55 GALV' },
  { id: '85517J', description: 'BOB 2 PERFIL US 200X75X1,55 GALV' },
  { id: '85518J', description: 'BOB 2 PERFIL UE 50X25X10X1,55 GALV' },
  { id: '85519J', description: 'BOB 2 PERFIL UE 75X25X15X1,55 GALV' },
  { id: '85520J', description: 'BOB 2 PERFIL UE 75X40X15X1,55 GALV' },
  { id: '85521J', description: 'BOB 2 PERFIL UE 100X40X17X1,55 GALV' },
  { id: '85522J', description: 'BOB 2 PERFIL UE 100X50X17X1,55 GALV' },
  { id: '85523J', description: 'BOB 2 PERFIL UE 127X25X17X1,55 GALV' },
  { id: '85524J', description: 'BOB 2 PERFIL UE 127X50X17X1,55 GALV' },
  { id: '85525J', description: 'BOB 2 PERFIL UE 150X50X17X1,55 GALV' },
  { id: '85526J', description: 'BOB 2 PERFIL UE 150X60X20X1,55 GALV' },
  { id: '85527J', description: 'BOB 2 PERFIL UE 200X60X20X1,55 GALV' },
  { id: '85528J', description: 'BOB 2 PERFIL UE 200X75X25X1,55 GALV' },
  { id: '85529J', description: 'BOB 2 PERFIL UE 250X75X25X1,55 GALV' },
  { id: '85530J', description: 'BOB 2 PERFIL UE 300X75X25X1,55 GALV' },
  { id: '85531J', description: 'BOB 2 PERFIL U PORTA 25X25X1,55 GALV' },
  { id: '85532J', description: 'BOB 2 PERFIL U PORTA 25X32X1,55 GALV' },
  { id: '85533J', description: 'BOB 2 PERFIL U BANDEJA 127X30X1,55 GAL' },
  { id: '85500K', description: 'BOB 2 PERFIL US 45X17X1,95 GALV' },
  { id: '85501K', description: 'BOB 2 PERFIL US 50X25X1,95 GALV' },
  { id: '85502K', description: 'BOB 2 PERFIL US 68X30X1,95 GALV' },
  { id: '85503K', description: 'BOB 2 PERFIL US 75X40X1,95 GALV' },
  { id: '85504K', description: 'BOB 2 PERFIL US 92X30X1,95 GALV' },
  { id: '85505K', description: 'BOB 2 PERFIL US 100X40X1,95 GALV' },
  { id: '85506K', description: 'BOB 2 PERFIL US 100X50X1,95 GALV' },
  { id: '85507K', description: 'BOB 2 PERFIL US 120X30X1,95 GALV' },
  { id: '85508K', description: 'BOB 2 PERFIL US 120X40X1,95 GALV' },
  { id: '85509K', description: 'BOB 2 PERFIL US 127X40X1,95 GALV' },
  { id: '85510K', description: 'BOB 2 PERFIL US 127X50X1,95 GALV' },
  { id: '85511K', description: 'BOB 2 PERFIL US 140X40X1,95 GALV' },
  { id: '85512K', description: 'BOB 2 PERFIL US 140X50X1,95 GALV' },
  { id: '85513K', description: 'BOB 2 PERFIL US 150X40X1,95 GALV' },
  { id: '85514K', description: 'BOB 2 PERFIL US 150X50X1,95 GALV' },
  { id: '85515K', description: 'BOB 2 PERFIL US 150X60X1,95 GALV' },
  { id: '85516K', description: 'BOB 2 PERFIL US 200X50X1,95 GALV' },
  { id: '85517K', description: 'BOB 2 PERFIL US 200X75X1,95 GALV' },
  { id: '85518K', description: 'BOB 2 PERFIL UE 50X25X10X1,95 GALV' },
  { id: '85519K', description: 'BOB 2 PERFIL UE 75X25X15X1,95 GALV' },
  { id: '85520K', description: 'BOB 2 PERFIL UE 75X40X15X1,95 GALV' },
  { id: '85521K', description: 'BOB 2 PERFIL UE 100X40X17X1,95 GALV' },
  { id: '85522K', description: 'BOB 2 PERFIL UE 100X50X17X1,95 GALV' },
  { id: '85523K', description: 'BOB 2 PERFIL UE 127X25X17X1,95 GALV' },
  { id: '85524K', description: 'BOB 2 PERFIL UE 127X50X17X1,95 GALV' },
  { id: '85525K', description: 'BOB 2 PERFIL UE 150X50X17X1,95 GALV' },
  { id: '85526K', description: 'BOB 2 PERFIL UE 150X60X20X1,95 GALV' },
  { id: '85527K', description: 'BOB 2 PERFIL UE 200X60X20X1,95 GALV' },
  { id: '85528K', description: 'BOB 2 PERFIL UE 200X75X25X1,95 GALV' },
  { id: '85529K', description: 'BOB 2 PERFIL UE 250X75X25X1,95 GALV' },
  { id: '85530K', description: 'BOB 2 PERFIL UE 300X75X25X1,95 GALV' },
  { id: '85531K', description: 'BOB 2 PERFIL U PORTA 25X25X1,95 GALV' },
  { id: '85532K', description: 'BOB 2 PERFIL U PORTA 25X32X1,95 GALV' },
  { id: '85533K', description: 'BOB 2 PERFIL U BANDEJA 127X30X1,95 GAL' },
  { id: '85500L', description: 'BOB 2 PERFIL US 45X17X2,30 GALV' },
  { id: '85501L', description: 'BOB 2 PERFIL US 50X25X2,30 GALV' },
  { id: '85502L', description: 'BOB 2 PERFIL US 68X30X2,30 GALV' },
  { id: '85503L', description: 'BOB 2 PERFIL US 75X40X2,30 GALV' },
  { id: '85504L', description: 'BOB 2 PERFIL US 92X30X2,30 GALV' },
  { id: '85505L', description: 'BOB 2 PERFIL US 100X40X2,30 GALV' },
  { id: '85506L', description: 'BOB 2 PERFIL US 100X50X2,30 GALV' },
  { id: '85507L', description: 'BOB 2 PERFIL US 120X30X2,30 GALV' },
  { id: '85508L', description: 'BOB 2 PERFIL US 120X40X2,30 GALV' },
  { id: '85509L', description: 'BOB 2 PERFIL US 127X40X2,30 GALV' },
  { id: '85510L', description: 'BOB 2 PERFIL US 127X50X2,30 GALV' },
  { id: '85511L', description: 'BOB 2 PERFIL US 140X40X2,30 GALV' },
  { id: '85512L', description: 'BOB 2 PERFIL US 140X50X2,30 GALV' },
  { id: '85513L', description: 'BOB 2 PERFIL US 150X40X2,30 GALV' },
  { id: '85514L', description: 'BOB 2 PERFIL US 150X50X2,30 GALV' },
  { id: '85515L', description: 'BOB 2 PERFIL US 150X60X2,30 GALV' },
  { id: '85516L', description: 'BOB 2 PERFIL US 200X50X2,30 GALV' },
  { id: '85517L', description: 'BOB 2 PERFIL US 200X75X2,30 GALV' },
  { id: '85518L', description: 'BOB 2 PERFIL UE 50X25X10X2,30 GALV' },
  { id: '85519L', description: 'BOB 2 PERFIL UE 75X25X15X2,30 GALV' },
  { id: '85520L', description: 'BOB 2 PERFIL UE 75X40X15X2,30 GALV' },
  { id: '85521L', description: 'BOB 2 PERFIL UE 100X40X17X2,30 GALV' },
  { id: '85522L', description: 'BOB 2 PERFIL UE 100X50X17X2,30 GALV' },
  { id: '85523L', description: 'BOB 2 PERFIL UE 127X25X17X2,30 GALV' },
  { id: '85524L', description: 'BOB 2 PERFIL UE 127X50X17X2,30 GALV' },
  { id: '85525L', description: 'BOB 2 PERFIL UE 150X50X17X2,30 GALV' },
  { id: '85526L', description: 'BOB 2 PERFIL UE 150X60X20X2,30 GALV' },
  { id: '85527L', description: 'BOB 2 PERFIL UE 200X60X20X2,30 GALV' },
  { id: '85528L', description: 'BOB 2 PERFIL UE 200X75X25X2,30 GALV' },
  { id: '85529L', description: 'BOB 2 PERFIL UE 250X75X25X2,30 GALV' },
  { id: '85503M', description: 'BOB 2 PERFIL UE 75X40X2,75 GALV' },
  { id: '85530L', description: 'BOB 2 PERFIL UE 300X75X25X2,30 GALV' },
];


// =======================================
// COMPONENTE DE LOGIN POR NOME
// =======================================
const LoginComponent = ({ setUserName }) => {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length > 2) {
      setUserName(trimmed);
      localStorage.setItem("inventoryUserName", trimmed);
    } else {
      setError("Digite um nome com pelo menos 3 letras.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-indigo-50 p-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-xl shadow-2xl">
        <h2 className="text-2xl font-bold text-indigo-700 mb-6 text-center">
          Identificação
        </h2>
        <p className="text-sm text-gray-500 mb-6 text-center">
          Digite seu nome para iniciar o inventário.
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            placeholder="Seu nome"
            className="w-full border p-3 rounded-lg shadow-sm"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button className="w-full bg-indigo-600 text-white p-3 rounded-xl shadow hover:bg-indigo-700">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};

// =======================================
// APP PRINCIPAL
// =======================================
const App = () => {
  // USER
  const [userName, setUserName] = useState(null);
  const [uid, setUid] = useState(null);

  // UI
  const [catalog] = useState(initialInventoryCatalog);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [weight, setWeight] = useState("");
  const [message, setMessage] = useState("");
  const [isSelecting, setIsSelecting] = useState(false);

  // FIREBASE
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [inventoryLaunches, setInventoryLaunches] = useState([]);

  const appId = "inventario-bobina2";

  // ===============================
  // LOGIN ANÔNIMO AUTOMÁTICO
  // ===============================
  useEffect(() => {
    const saved = localStorage.getItem("inventoryUserName");
    if (saved) setUserName(saved);

    // faz login anônimo
    signInAnonymously(auth)
      .then(() => {
        console.log("Login anônimo ok");
      })
      .catch((err) => {
        console.error("Erro no login anônimo:", err);
        setMessage("Erro ao autenticar no Firebase.");
      });

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        console.log("UID autenticado:", user.uid);
      } else {
        setUid(null);
      }
      setIsAuthReady(true);
    });

    return () => unsub();
  }, []);

  // ===============================
  // FIRESTORE REALTIME LISTENER
  // ===============================
  useEffect(() => {
    if (!isAuthReady || !uid) return;

    const inventoryPath = `artifacts/${appId}/users/${uid}/cyclic_inventory_weight`;
    const q = query(
      collection(db, inventoryPath),
      orderBy("timestamp", "desc"),
      limit(50)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        timestamp: d.data().timestamp?.toDate?.() ?? new Date()
      }));
      setInventoryLaunches(docs);
    });

    return () => unsub();
  }, [uid, isAuthReady]);

  // ===============================
  // LANÇAMENTO DE PESO
  // ===============================
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("SUBMIT DISPARADO", { selectedItem, weight, uid });

    if (!isAuthReady) {
      setMessage("Aguarde, autenticando no Firebase...");
      return;
    }

    if (!uid) {
      setMessage("Usuário não autenticado. Atualize a página.");
      return;
    }

    if (!selectedItem) {
      setMessage("Selecione a bobina.");
      return;
    }

    if (!weight) {
      setMessage("Informe o peso.");
      return;
    }

    const numeric = parseFloat(weight.replace(",", "."));
    if (isNaN(numeric) || numeric <= 0) {
      setMessage("Peso inválido.");
      return;
    }

    try {
      const path = `artifacts/${appId}/users/${uid}/cyclic_inventory_weight`;
      await addDoc(collection(db, path), {
        itemId: selectedItem.id,
        description: selectedItem.description,
        weightKg: numeric,
        timestamp: serverTimestamp(),
        userName,
        uid
      });

      setWeight("");
      setIsSelecting(false);
      setMessage(`Lançado com sucesso: ${numeric} kg (${selectedItem.id})`);
    } catch (err) {
      console.error("Erro ao gravar lançamento:", err);
      setMessage("Erro ao salvar no Firestore.");
    }
  };

  // ===============================
  // EXCLUSÃO
  // ===============================
  const handleDelete = async (id) => {
    if (!uid) return;

    const path = `artifacts/${appId}/users/${uid}/cyclic_inventory_weight`;
    try {
      await deleteDoc(doc(db, path, id));
    } catch (err) {
      console.error("Erro ao excluir:", err);
      setMessage("Erro ao excluir lançamento.");
    }
  };

  // ===============================
  // CSV EXPORT
  // ===============================
  const handleExport = () => {
    if (!inventoryLaunches.length) {
      setMessage("Não há dados.");
      return;
    }

    const header = "Data;ID;Descrição;Peso (kg);Usuário\n";
    const rows = inventoryLaunches
      .map((l) =>
        [
          l.timestamp.toLocaleString("pt-BR"),
          l.itemId,
          l.description,
          l.weightKg.toFixed(2).replace(".", ","),
          l.userName
        ].join(";")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "inventario.csv";
    link.click();
  };

  // ===============================
  // FILTRO DO CATÁLOGO
  // ===============================
  const filteredCatalog = useMemo(() => {
    if (!searchTerm) return catalog;
    const s = searchTerm.toLowerCase();
    return catalog.filter(
      (i) =>
        i.id.toLowerCase().includes(s) ||
        i.description.toLowerCase().includes(s)
    );
  }, [searchTerm, catalog]);

  // ===============================
  // TELA DE LOGIN
  // ===============================
  if (!userName) return <LoginComponent setUserName={setUserName} />;

  // ===============================
  // TELA PRINCIPAL
  // ===============================
  return (
    <div className="min-h-screen p-4 bg-gray-100 font-sans">
      <header className="text-center mb-8">
        <h1 className="text-2xl font-bold text-indigo-700">
          Inventário Cíclico — Bobina 2
        </h1>
        <p className="text-sm text-gray-500">
          Usuário: <strong>{userName}</strong>
        </p>
        {message && (
          <div className="mt-3 bg-indigo-100 text-indigo-700 p-2 rounded-lg">
            {message}
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {isSelecting && (
          <div className="bg-white p-6 rounded-xl shadow-xl">
            <h2 className="text-lg font-bold text-indigo-600 mb-2">
              Catálogo de Bobinas ({catalog.length})
            </h2>

            <input
              className="w-full border p-2 rounded mb-3"
              placeholder="Buscar código ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="max-h-[60vh] overflow-y-auto space-y-2">
              {filteredCatalog.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedItem(item);
                    setIsSelecting(false);
                    setMessage(`Selecionado: ${item.id}`);
                  }}
                  className="p-3 bg-gray-50 hover:bg-indigo-50 border rounded-lg cursor-pointer"
                >
                  <p className="font-bold text-sm">{item.id}</p>
                  <p className="text-xs">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-xl shadow-xl">
          {!selectedItem ? (
            <button
              className="w-full bg-indigo-600 text-white p-3 rounded-xl shadow"
              onClick={() => setIsSelecting(true)}
            >
              Selecionar Bobina
            </button>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="bg-indigo-50 p-3 rounded-lg">
                <p className="text-sm text-indigo-700 font-bold">
                  {selectedItem.id} — {selectedItem.description}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedItem(null);
                    setWeight("");
                    setIsSelecting(true);
                  }}
                  className="text-xs text-red-600 mt-1"
                >
                  Trocar bobina
                </button>
              </div>

              <input
                type="text"
                placeholder="Peso (kg)"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full border p-3 rounded-lg"
              />

              <button className="w-full bg-green-600 text-white p-3 rounded-xl shadow">
                Lançar Peso
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Histórico */}
      <section className="max-w-5xl mx-auto mt-8 bg-white p-6 rounded-xl shadow-xl">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-indigo-600 text-lg">
            Últimos Lançamentos
          </h2>
          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-4 py-2 rounded-xl"
          >
            Exportar CSV
          </button>
        </div>

        {inventoryLaunches.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            Nenhum lançamento ainda.
          </p>
        ) : (
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {inventoryLaunches.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-green-50 border-l-4 border-green-600 rounded flex justify-between"
              >
                <div>
                  <p className="font-bold text-sm">{item.description}</p>
                  <p className="text-xs">
                    {item.itemId} —{" "}
                    <strong>{item.weightKg.toFixed(2)} kg</strong>
                    <span className="text-gray-500">
                      {" "}
                      por {item.userName}
                    </span>
                  </p>
                </div>

                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-red-600 text-sm"
                >
                  excluir
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default App;