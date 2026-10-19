use sha2::{Sha256, Digest};

pub fn compute_audit_hash(payload: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(payload.as_bytes());
    let result = hasher.finalize();
    hex::encode(result)
}

fn main() {
    println!("URBANIX Rust Security & Integrity Verification Utility");
    let sample_audit = "ORDER_COMPLETED:order_12345:amount_500000";
    let hash = compute_audit_hash(sample_audit);
    println!("Computed SHA256 Audit Integrity Hash: {}", hash);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compute_audit_hash() {
        let input = "URBANIX_SECURITY_TEST";
        let hash = compute_audit_hash(input);
        assert_eq!(hash.len(), 64); // SHA256 length in hex
    }
}
