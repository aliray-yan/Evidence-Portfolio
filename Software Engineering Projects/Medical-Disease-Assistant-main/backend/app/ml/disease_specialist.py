"""
Disease to Medical Specialist Mapping
"""

DISEASE_TO_SPECIALIST = {
    "(vertigo) Paroymsal Positional Vertigo": "ENT Specialist / Neurologist",
    "AIDS": "Infectious Disease Specialist",
    "Acne": "Dermatologist",
    "Alcoholic hepatitis": "Hepatologist / Gastroenterologist",
    "Allergy": "Allergist / Immunologist",
    "Arthritis": "Rheumatologist",
    "Bronchial Asthma": "Pulmonologist",
    "Cervical spondylosis": "Orthopedic Surgeon / Neurologist",
    "Chicken pox": "General Physician / Dermatologist",
    "Chronic cholestasis": "Hepatologist / Gastroenterologist",
    "Common Cold": "General Physician",
    "Dengue": "Infectious Disease Specialist",
    "Diabetes": "Endocrinologist",
    "Dimorphic hemmorhoids(piles)": "Proctologist / General Surgeon",
    "Drug Reaction": "Allergist / Dermatologist",
    "Fungal infection": "Dermatologist",
    "GERD": "Gastroenterologist",
    "Gastroenteritis": "Gastroenterologist",
    "Heart attack": "Cardiologist",
    "Hepatitis A": "Hepatologist / Gastroenterologist",
    "Hepatitis B": "Hepatologist / Gastroenterologist",
    "Hepatitis C": "Hepatologist / Gastroenterologist",
    "Hepatitis D": "Hepatologist / Gastroenterologist",
    "Hepatitis E": "Hepatologist / Gastroenterologist",
    "Hypertension": "Cardiologist",
    "Hyperthyroidism": "Endocrinologist",
    "Hypoglycemia": "Endocrinologist",
    "Hypothyroidism": "Endocrinologist",
    "Impetigo": "Dermatologist",
    "Jaundice": "Hepatologist / Gastroenterologist",
    "Malaria": "Infectious Disease Specialist",
    "Migraine": "Neurologist",
    "Osteoarthristis": "Orthopedic Surgeon / Rheumatologist",
    "Paralysis (brain hemorrhage)": "Neurologist",
    "Peptic ulcer diseae": "Gastroenterologist",
    "Pneumonia": "Pulmonologist",
    "Psoriasis": "Dermatologist",
    "Tuberculosis": "Pulmonologist / Infectious Disease Specialist",
    "Typhoid": "Infectious Disease Specialist",
    "Urinary tract infection": "Urologist",
    "Varicose veins": "Vascular Surgeon",
    "hepatitis A": "Hepatologist / Gastroenterologist"
}

# Disease recommendations
DISEASE_RECOMMENDATIONS = {
    "(vertigo) Paroymsal Positional Vertigo": [
        "Avoid sudden head movements",
        "Perform Epley maneuver exercises as directed by doctor",
        "Stay hydrated",
        "Avoid driving until symptoms resolve"
    ],
    "AIDS": [
        "Seek immediate medical attention",
        "Follow prescribed antiretroviral therapy strictly",
        "Practice safe behaviors",
        "Regular monitoring of CD4 count"
    ],
    "Acne": [
        "Keep skin clean with gentle cleansers",
        "Avoid touching or picking at acne",
        "Use non-comedogenic products",
        "Consider topical treatments as recommended"
    ],
    "Alcoholic hepatitis": [
        "Stop alcohol consumption immediately",
        "Follow prescribed medications",
        "Maintain healthy diet",
        "Regular liver function tests"
    ],
    "Allergy": [
        "Identify and avoid allergens",
        "Keep antihistamines available",
        "Consider allergy testing",
        "Maintain clean living environment"
    ],
    "Arthritis": [
        "Regular gentle exercise",
        "Maintain healthy weight",
        "Apply hot/cold therapy as needed",
        "Take medications as prescribed"
    ],
    "Bronchial Asthma": [
        "Avoid known triggers",
        "Keep rescue inhaler available",
        "Follow asthma action plan",
        "Regular check-ups with pulmonologist"
    ],
    "Cervical spondylosis": [
        "Practice good posture",
        "Regular neck exercises",
        "Use ergonomic furniture",
        "Apply heat/cold therapy"
    ],
    "Chicken pox": [
        "Rest and isolate to prevent spread",
        "Keep skin clean and dry",
        "Avoid scratching",
        "Use calamine lotion for itching"
    ],
    "Chronic cholestasis": [
        "Follow low-fat diet",
        "Take prescribed medications",
        "Regular liver monitoring",
        "Avoid alcohol completely"
    ],
    "Common Cold": [
        "Rest and stay hydrated",
        "Use saline nasal spray",
        "Take over-the-counter medications for symptoms",
        "Wash hands frequently"
    ],
    "Dengue": [
        "Seek immediate medical attention",
        "Stay well hydrated",
        "Rest completely",
        "Monitor for warning signs"
    ],
    "Diabetes": [
        "Monitor blood sugar regularly",
        "Follow prescribed diet",
        "Exercise regularly",
        "Take medications as directed"
    ],
    "Dimorphic hemmorhoids(piles)": [
        "Increase fiber intake",
        "Stay well hydrated",
        "Avoid straining during bowel movements",
        "Use sitz baths for relief"
    ],
    "Drug Reaction": [
        "Stop the suspected medication",
        "Seek immediate medical attention",
        "Note all medications taken",
        "Carry medical alert information"
    ],
    "Fungal infection": [
        "Keep affected areas clean and dry",
        "Use antifungal medications as prescribed",
        "Avoid sharing personal items",
        "Wear breathable clothing"
    ],
    "GERD": [
        "Avoid trigger foods",
        "Eat smaller meals",
        "Don't lie down after eating",
        "Elevate head while sleeping"
    ],
    "Gastroenteritis": [
        "Stay hydrated with clear fluids",
        "Follow BRAT diet",
        "Rest adequately",
        "Practice good hygiene"
    ],
    "Heart attack": [
        "SEEK EMERGENCY MEDICAL CARE IMMEDIATELY",
        "Chew aspirin if not allergic",
        "Stay calm and rest",
        "Call emergency services"
    ],
    "Hepatitis A": [
        "Rest and stay hydrated",
        "Avoid alcohol",
        "Follow prescribed treatment",
        "Practice good hygiene"
    ],
    "Hepatitis B": [
        "Follow prescribed antiviral therapy",
        "Avoid alcohol",
        "Regular liver monitoring",
        "Practice safe behaviors"
    ],
    "Hepatitis C": [
        "Follow prescribed treatment regimen",
        "Avoid alcohol completely",
        "Regular liver function monitoring",
        "Prevent transmission to others"
    ],
    "Hepatitis D": [
        "Treat underlying Hepatitis B",
        "Avoid alcohol",
        "Regular medical monitoring",
        "Follow prescribed medications"
    ],
    "Hepatitis E": [
        "Rest and stay hydrated",
        "Avoid alcohol",
        "Follow supportive care",
        "Practice good hygiene"
    ],
    "Hypertension": [
        "Reduce salt intake",
        "Exercise regularly",
        "Maintain healthy weight",
        "Take medications as prescribed"
    ],
    "Hyperthyroidism": [
        "Take prescribed medications",
        "Regular thyroid monitoring",
        "Avoid excess iodine",
        "Manage stress"
    ],
    "Hypoglycemia": [
        "Keep fast-acting glucose available",
        "Eat regular meals",
        "Monitor blood sugar",
        "Wear medical alert identification"
    ],
    "Hypothyroidism": [
        "Take thyroid medication consistently",
        "Regular thyroid function tests",
        "Maintain healthy diet",
        "Exercise regularly"
    ],
    "Impetigo": [
        "Keep affected areas clean",
        "Use prescribed antibiotics",
        "Avoid touching or scratching",
        "Don't share personal items"
    ],
    "Jaundice": [
        "Seek medical evaluation",
        "Rest adequately",
        "Stay hydrated",
        "Avoid alcohol"
    ],
    "Malaria": [
        "Seek immediate treatment",
        "Complete full course of medication",
        "Rest and stay hydrated",
        "Use mosquito prevention"
    ],
    "Migraine": [
        "Identify and avoid triggers",
        "Rest in dark, quiet room",
        "Take prescribed medications",
        "Maintain regular sleep schedule"
    ],
    "Osteoarthristis": [
        "Maintain healthy weight",
        "Regular low-impact exercise",
        "Use joint protection techniques",
        "Consider physical therapy"
    ],
    "Paralysis (brain hemorrhage)": [
        "SEEK EMERGENCY MEDICAL CARE IMMEDIATELY",
        "Do not move the person",
        "Note time symptoms started",
        "Keep airway clear"
    ],
    "Peptic ulcer diseae": [
        "Avoid NSAIDs and alcohol",
        "Take prescribed medications",
        "Eat smaller, frequent meals",
        "Manage stress"
    ],
    "Pneumonia": [
        "Take prescribed antibiotics completely",
        "Rest and stay hydrated",
        "Use humidifier",
        "Avoid smoking"
    ],
    "Psoriasis": [
        "Keep skin moisturized",
        "Follow prescribed treatments",
        "Avoid triggers",
        "Manage stress"
    ],
    "Tuberculosis": [
        "Complete full course of medications",
        "Isolate as directed",
        "Cover mouth when coughing",
        "Regular follow-up appointments"
    ],
    "Typhoid": [
        "Complete prescribed antibiotics",
        "Stay hydrated",
        "Practice good hygiene",
        "Rest adequately"
    ],
    "Urinary tract infection": [
        "Complete prescribed antibiotics",
        "Drink plenty of water",
        "Urinate frequently",
        "Practice good hygiene"
    ],
    "Varicose veins": [
        "Elevate legs regularly",
        "Exercise regularly",
        "Wear compression stockings",
        "Avoid prolonged standing"
    ],
    "hepatitis A": [
        "Rest and stay hydrated",
        "Avoid alcohol",
        "Follow prescribed treatment",
        "Practice good hygiene"
    ]
}


def get_specialist(disease: str) -> str:
    """Get recommended specialist for a disease"""
    return DISEASE_TO_SPECIALIST.get(disease, "General Physician")


def get_recommendations(disease: str) -> list:
    """Get health recommendations for a disease"""
    return DISEASE_RECOMMENDATIONS.get(disease, [
        "Consult with a healthcare professional",
        "Follow prescribed treatment plan",
        "Rest and stay hydrated",
        "Monitor your symptoms"
    ])