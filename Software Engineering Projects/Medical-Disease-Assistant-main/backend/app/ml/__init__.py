"""
Machine Learning Module
"""

from app.ml.predict import predict_disease, get_top_predictions, get_available_symptoms
from app.ml.disease_specialist import get_specialist, get_recommendations
from app.ml.symptoms_list import SYMPTOMS_LIST, get_symptoms_list

__all__ = [
    'predict_disease',
    'get_top_predictions',
    'get_available_symptoms',
    'get_specialist',
    'get_recommendations',
    'SYMPTOMS_LIST',
    'get_symptoms_list'
]