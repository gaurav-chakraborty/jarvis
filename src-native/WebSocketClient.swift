import Foundation

struct AssessmentResult: Codable {
    let answer: String
    let explanation: String
    let optionNumber: Int?
    let answerLetter: String?
}

class WebSocketClient: NSObject, URLSessionWebSocketDelegate {
    static let shared = WebSocketClient()
    
    private var webSocket: URLSessionWebSocketTask?
    private var responseHandler: ((Result<AssessmentResult, Error>) -> Void)?
    
    private override init() {
        super.init()
        connect()
    }
    
    func connect() {
        let url = URL(string: "ws://localhost:8765")!
        let session = URLSession(configuration: .default, delegate: self, delegateQueue: OperationQueue.main)
        webSocket = session.webSocketTask(with: url)
        webSocket?.resume()
        listen()
    }
    
    func sendAssessment(text: String, completion: @escaping (Result<AssessmentResult, Error>) -> Void) {
        responseHandler = completion
        let message: [String: Any] = ["type": "assessment", "payload": ["text": text]]
        guard let data = try? JSONSerialization.data(withJSONObject: message),
              let jsonString = String(data: data, encoding: .utf8) else {
            completion(.failure(NSError(domain: "Invalid message", code: -1)))
            return
        }
        webSocket?.send(.string(jsonString)) { error in
            if let error = error {
                completion(.failure(error))
            }
        }
    }
    
    private func listen() {
        webSocket?.receive { [weak self] result in
            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    self?.handleMessage(text)
                default:
                    break
                }
                self?.listen() // continue listening
            case .failure(let error):
                print("WebSocket receive error: \(error)")
                // attempt reconnect after delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                    self?.connect()
                }
            }
        }
    }
    
    private func handleMessage(_ text: String) {
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else { return }
        
        if type == "assessment-result", let payload = json["payload"] as? [String: Any] {
            let result = AssessmentResult(
                answer: payload["answer"] as? String ?? "",
                explanation: payload["explanation"] as? String ?? "",
                optionNumber: payload["optionNumber"] as? Int,
                answerLetter: payload["answerLetter"] as? String
            )
            responseHandler?(.success(result))
            responseHandler = nil
        } else if type == "error" {
            let errorMsg = json["payload"] as? String ?? "Unknown error"
            responseHandler?(.failure(NSError(domain: errorMsg, code: -1)))
            responseHandler = nil
        }
    }
    
    // MARK: - URLSessionWebSocketDelegate
    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didOpenWithProtocol protocol: String?) {
        print("WebSocket connected")
    }
    
    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didCloseWith closeCode: URLSessionWebSocketTask.CloseCode, reason: Data?) {
        print("WebSocket disconnected")
        // Attempt reconnect
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            self.connect()
        }
    }
}
