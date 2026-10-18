"""
Disease Prediction Module
Handles ML model loading and predictions
"""

import joblib
import numpy as np
import os
from typing import List, Dict, Any
from app.ml.disease_specialist import get_specialist, get_recommendations
from app.ml.symptoms_list import SYMPTOMS_LIST, validate_symptoms

# Model paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'model.joblib')
FEATURES_PATH = os.path.join(BASE_DIR, 'features.joblib')
ENCODER_PATH = os.path.join(BASE_DIR, 'label_encoder.joblib')

# Global model variables
_model = None
_features = None
_label_encoder = None


def load_model():
    """Load the trained model and associated files"""
    global _model, _features, _label_encoder
    
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"Model not found at {MODEL_PATH}. Please run train_model.py first."
            )
        
        _model = joblib.load(MODEL_PATH)
        _features = joblib.load(FEATURES_PATH)
        _label_encoder = joblib.load(ENCODER_PATH)
    
    return _model, _features, _label_encoder


def predict_disease(symptoms: List[str]) -> Dict[str, Any]:
    """
    Predict disease based on symptoms
    
    Args:
        symptoms: List of symptom names
        
    Returns:
        Dictionary with prediction results
    """
    # Load model
    model, features, label_encoder = load_model()
    
    # Validate and normalize symptoms
    valid_symptoms = validate_symptoms(symptoms)
    
    if not valid_symptoms:
        return {
            "disease": "Unknown",
            "confidence": 0.0,
            "specialist": "General Physician",
            "symptoms_matched": [],
            "recommendations": ["Please provide valid symptoms for diagnosis"],
            "error": "No valid symptoms provided"
        }
    
    # Create feature vector
    feature_vector = np.zeros(len(features))
    matched_symptoms = []
    
    for symptom in valid_symptoms:
        if symptom in features:
            idx = features.index(symptom)
            feature_vector[idx] = 1
            matched_symptoms.append(symptom)
    
    if not matched_symptoms:
        return {
            "disease": "Unknown",
            "confidence": 0.0,
            "specialist": "General Physician",
            "symptoms_matched": [],
            "recommendations": ["The provided symptoms could not be matched"],
            "error": "No symptoms matched"
        }
    
    # Make prediction
    prediction_encoded = model.predict([feature_vector])[0]
    confidence_scores = model.predict_proba([feature_vector])[0]
    confidence = float(max(confidence_scores))
    
    # Decode prediction
    disease = label_encoder.inverse_transform([prediction_encoded])[0]
    
    # Get specialist and recommendations
    specialist = get_specialist(disease)
    recommendations = get_recommendations(disease)
    
    return {
        "disease": disease,
        "confidence": round(confidence, 4),
        "specialist": specialist,
        "symptoms_matched": matched_symptoms,
        "recommendations": recommendations
    }


def get_top_predictions(symptoms: List[str], top_n: int = 3) -> List[Dict[str, Any]]:
    """
    Get top N disease predictions
    
    Args:
        symptoms: List of symptom names
        top_n: Number of top predictions to return
        
    Returns:
        List of prediction dictionaries
    """
    # Load model
    model, features, label_encoder = load_model()
    
    # Validate symptoms
    valid_symptoms = validate_symptoms(symptoms)
    
    if not valid_symptoms:
        return []
    
    # Create feature vector
    feature_vector = np.zeros(len(features))
    
    for symptom in valid_symptoms:
        if symptom in features:
            idx = features.index(symptom)
            feature_vector[idx] = 1
    
    # Get probability scores
    probabilities = model.predict_proba([feature_vector])[0]
    
    # Get top N predictions
    top_indices = np.argsort(probabilities)[-top_n:][::-1]
    
    predictions = []
    for idx in top_indices:
        disease = label_encoder.inverse_transform([idx])[0]
        confidence = float(probabilities[idx])
        
        predictions.append({
            "disease": disease,
            "confidence": round(confidence, 4),
            "specialist": get_specialist(disease),
            "recommendations": get_recommendations(disease)
        })
    
    return predictions


def get_available_symptoms() -> List[str]:
    """Return list of all available symptoms"""
    return SYMPTOMS_LIST.copy()