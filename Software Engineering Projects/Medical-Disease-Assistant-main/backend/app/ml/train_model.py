"""
Machine Learning Model Training Script
Trains a disease prediction model using the provided dataset
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os
import warnings
warnings.filterwarnings('ignore')

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, '..', '..', 'data', 'Training.csv')
MODEL_PATH = os.path.join(BASE_DIR, 'model.joblib')
FEATURES_PATH = os.path.join(BASE_DIR, 'features.joblib')
ENCODER_PATH = os.path.join(BASE_DIR, 'label_encoder.joblib')


def load_and_preprocess_data(filepath):
    """Load and preprocess the training data"""
    print("Loading dataset...")
    df = pd.read_csv(filepath)
    
    # Remove any unnamed columns
    df = df.loc[:, ~df.columns.str.contains('^Unnamed')]
    
    # Handle the prognosis column (target)
    if 'prognosis' not in df.columns:
        raise ValueError("Dataset must have 'prognosis' column")
    
    # Get feature columns (all except prognosis)
    feature_columns = [col for col in df.columns if col != 'prognosis']
    
    # Fill any NaN values with 0
    df[feature_columns] = df[feature_columns].fillna(0)
    
    # Ensure all feature values are numeric (0 or 1)
    for col in feature_columns:
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)
    
    print(f"Dataset loaded: {len(df)} samples, {len(feature_columns)} features")
    print(f"Diseases: {df['prognosis'].nunique()} unique classes")
    
    return df, feature_columns


def train_model(df, feature_columns):
    """Train the disease prediction model"""
    print("\nPreparing features and labels...")
    
    X = df[feature_columns].values
    y = df['prognosis'].values
    
    # Encode labels
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    
    print(f"Classes: {list(label_encoder.classes_)[:10]}... ({len(label_encoder.classes_)} total)")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )
    
    print(f"\nTraining set: {len(X_train)} samples")
    print(f"Testing set: {len(X_test)} samples")
    
    # Train Random Forest model
    print("\nTraining Random Forest model...")
    rf_model = RandomForestClassifier(
        n_estimators=100,
        max_depth=20,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    rf_model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = rf_model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"\nModel Accuracy: {accuracy * 100:.2f}%")
    
    # Cross-validation
    cv_scores = cross_val_score(rf_model, X, y_encoded, cv=5)
    print(f"Cross-validation accuracy: {cv_scores.mean() * 100:.2f}% (+/- {cv_scores.std() * 100:.2f}%)")
    
    if accuracy < 0.95:
        print("\nWarning: Accuracy below 95%, trying with more estimators...")
        rf_model = RandomForestClassifier(
            n_estimators=200,
            max_depth=30,
            min_samples_split=2,
            min_samples_leaf=1,
            random_state=42,
            n_jobs=-1
        )
        rf_model.fit(X_train, y_train)
        y_pred = rf_model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        print(f"Improved Accuracy: {accuracy * 100:.2f}%")
    
    return rf_model, label_encoder, feature_columns


def save_model(model, label_encoder, feature_columns):
    """Save trained model and associated files"""
    print("\nSaving model and encoders...")
    
    # Create directory if not exists
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    
    # Save model
    joblib.dump(model, MODEL_PATH)
    print(f"Model saved to: {MODEL_PATH}")
    
    # Save label encoder
    joblib.dump(label_encoder, ENCODER_PATH)
    print(f"Label encoder saved to: {ENCODER_PATH}")
    
    # Save feature columns
    joblib.dump(feature_columns, FEATURES_PATH)
    print(f"Features saved to: {FEATURES_PATH}")


def create_sample_dataset():
    """Create a sample training dataset if none exists"""
    print("Creating sample training dataset...")
    
    from app.ml.symptoms_list import SYMPTOMS_LIST
    
    # Define disease-symptom mappings (simplified for demonstration)
    disease_symptoms = {
        "Fungal infection": ["itching", "skin_rash", "nodal_skin_eruptions"],
        "Allergy": ["continuous_sneezing", "shivering", "chills", "watering_from_eyes"],
        "GERD": ["acidity", "vomiting", "stomach_pain", "nausea"],
        "Chronic cholestasis": ["itching", "yellowish_skin", "abdominal_pain", "dark_urine"],
        "Drug Reaction": ["itching", "skin_rash", "stomach_pain", "burning_micturition"],
        "Peptic ulcer diseae": ["vomiting", "stomach_pain", "acidity", "loss_of_appetite"],
        "AIDS": ["muscle_wasting", "high_fever", "extra_marital_contacts", "fatigue"],
        "Diabetes": ["fatigue", "weight_loss", "polyuria", "excessive_hunger"],
        "Gastroenteritis": ["vomiting", "diarrhoea", "dehydration", "abdominal_pain"],
        "Bronchial Asthma": ["breathlessness", "cough", "mucoid_sputum", "high_fever"],
        "Hypertension": ["headache", "chest_pain", "dizziness", "lack_of_concentration"],
        "Migraine": ["headache", "visual_disturbances", "nausea", "lack_of_concentration"],
        "Cervical spondylosis": ["neck_pain", "dizziness", "back_pain", "weakness_in_limbs"],
        "Paralysis (brain hemorrhage)": ["vomiting", "headache", "weakness_of_one_body_side", "altered_sensorium"],
        "Jaundice": ["yellowish_skin", "dark_urine", "fatigue", "weight_loss"],
        "Malaria": ["high_fever", "chills", "sweating", "headache", "nausea"],
        "Chicken pox": ["skin_rash", "high_fever", "itching", "fatigue"],
        "Dengue": ["high_fever", "headache", "pain_behind_the_eyes", "fatigue"],
        "Typhoid": ["high_fever", "fatigue", "abdominal_pain", "constipation"],
        "Hepatitis A": ["yellowish_skin", "dark_urine", "nausea", "fatigue"],
        "Hepatitis B": ["yellowish_skin", "dark_urine", "fatigue", "abdominal_pain"],
        "Hepatitis C": ["yellowish_skin", "nausea", "fatigue", "loss_of_appetite"],
        "Hepatitis D": ["yellowish_skin", "fatigue", "dark_urine", "joint_pain"],
        "Hepatitis E": ["yellowish_skin", "nausea", "dark_urine", "fatigue"],
        "Alcoholic hepatitis": ["yellowish_skin", "abdominal_pain", "history_of_alcohol_consumption", "fatigue"],
        "Tuberculosis": ["cough", "high_fever", "fatigue", "weight_loss", "blood_in_sputum"],
        "Common Cold": ["continuous_sneezing", "cough", "runny_nose", "congestion"],
        "Pneumonia": ["cough", "high_fever", "breathlessness", "chest_pain"],
        "Heart attack": ["chest_pain", "sweating", "breathlessness", "vomiting"],
        "Varicose veins": ["swollen_legs", "swollen_blood_vessels", "fatigue", "cramps"],
        "Hypothyroidism": ["fatigue", "weight_gain", "cold_hands_and_feets", "mood_swings"],
        "Hyperthyroidism": ["weight_loss", "restlessness", "sweating", "fast_heart_rate"],
        "Hypoglycemia": ["fatigue", "anxiety", "sweating", "headache"],
        "Osteoarthristis": ["joint_pain", "knee_pain", "hip_joint_pain", "swelling_joints"],
        "Arthritis": ["joint_pain", "muscle_weakness", "swelling_joints", "movement_stiffness"],
        "(vertigo) Paroymsal Positional Vertigo": ["dizziness", "loss_of_balance", "spinning_movements", "nausea"],
        "Acne": ["skin_rash", "pus_filled_pimples", "blackheads", "scurring"],
        "Urinary tract infection": ["burning_micturition", "bladder_discomfort", "foul_smell_of_urine", "continuous_feel_of_urine"],
        "Psoriasis": ["skin_rash", "skin_peeling", "silver_like_dusting", "small_dents_in_nails"],
        "Impetigo": ["skin_rash", "blister", "red_sore_around_nose", "yellow_crust_ooze"],
        "Dimorphic hemmorhoids(piles)": ["pain_during_bowel_movements", "pain_in_anal_region", "bloody_stool", "constipation"]
    }
    
    # Generate training data
    data = []
    for disease, symptoms in disease_symptoms.items():
        for _ in range(100):  # 100 samples per disease
            row = {symptom: 0 for symptom in SYMPTOMS_LIST}
            # Add primary symptoms
            for symptom in symptoms:
                if symptom in row:
                    row[symptom] = 1
            # Add some random additional symptoms
            import random
            additional = random.sample([s for s in SYMPTOMS_LIST if s not in symptoms], 
                                       random.randint(0, 3))
            for symptom in additional:
                row[symptom] = 1
            row['prognosis'] = disease
            data.append(row)
    
    df = pd.DataFrame(data)
    
    # Save to file
    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    df.to_csv(DATA_PATH, index=False)
    print(f"Sample dataset saved to: {DATA_PATH}")
    
    return df


def main():
    """Main training function"""
    print("=" * 60)
    print("Medical Diagnosis ML Model Training")
    print("=" * 60)
    
    # Check if training data exists
    if not os.path.exists(DATA_PATH):
        print(f"\nTraining data not found at: {DATA_PATH}")
        print("Creating sample dataset...")
        df = create_sample_dataset()
        feature_columns = [col for col in df.columns if col != 'prognosis']
    else:
        df, feature_columns = load_and_preprocess_data(DATA_PATH)
    
    # Train model
    model, label_encoder, features = train_model(df, feature_columns)
    
    # Save model
    save_model(model, label_encoder, features)
    
    print("\n" + "=" * 60)
    print("Training Complete!")
    print("=" * 60)
    
    return model, label_encoder, features


if __name__ == "__main__":
    main()