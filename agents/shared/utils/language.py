
def detect_language(text: str) -> str:
    """
    Detects the language of the provided text.
    Returns "vi" if Vietnamese characters are found, otherwise "en-us" for English.
    """
    if not text or not text.strip():
        return "vi"

    # Vietnamese specific characters (lower case)
    vi_chars = set("àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ")
    
    # Check if any Vietnamese character is present
    if any(c in vi_chars for c in text.lower()):
        return "vi"
    
    # If no Vietnamese characters, check if it contains English letters
    # If it's mostly ASCII letters, assume English en-us
    if any(c.isalpha() for c in text):
        return "en-us"
        
    return "vi"
