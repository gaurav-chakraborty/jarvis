import Vision
import Cocoa

struct RecognizedText {
    let text: String
    let boundingBox: CGRect  // in screen coordinates
}

class ScreenOCR {
    static func captureAndOCR(region: CGRect? = nil) -> (fullText: String, items: [RecognizedText]) {
        let screenRect = region ?? NSScreen.main?.frame ?? .zero
        guard let cgImage = CGWindowListCreateImage(screenRect, .optionOnScreenOnly, kCGNullWindowID, .bestResolution) else {
            return ("", [])
        }
        
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true
        
        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        try? handler.perform([request])
        
        guard let observations = request.results else { return ("", []) }
        
        var items: [RecognizedText] = []
        var allText = ""
        for observation in observations {
            guard let topCandidate = observation.topCandidates(1).first else { continue }
            let text = topCandidate.string
            allText += text + "\n"
            
            // Convert Vision's normalized bounding box to screen coordinates
            let imageSize = CGSize(width: cgImage.width, height: cgImage.height)
            let box = observation.boundingBox
            
            // Vision coordinates are normalized (0-1) and Y is bottom-up
            let x = box.origin.x * imageSize.width + screenRect.origin.x
            let y = (1 - box.origin.y - box.height) * imageSize.height + screenRect.origin.y
            let width = box.width * imageSize.width
            let height = box.height * imageSize.height
            let frame = CGRect(x: x, y: y, width: width, height: height)
            
            items.append(RecognizedText(text: text, boundingBox: frame))
        }
        return (allText, items)
    }
}
