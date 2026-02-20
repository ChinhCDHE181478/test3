
try:
    from shared.utils.language import detect_language
    print("Success: detect_language imported")
    print(f"Test: 'Hello' -> {detect_language('Hello')}")
    print(f"Test: 'Chào bạn' -> {detect_language('Chào bạn')}")
except Exception as e:
    print(f"Error: {e}")
    import sys
    print(f"Path: {sys.path}")
    import os
    print(f"CWD: {os.getcwd()}")
    print("Listing shared/utils:")
    try:
        print(os.listdir("shared/utils"))
    except:
        print("Could not list shared/utils")
