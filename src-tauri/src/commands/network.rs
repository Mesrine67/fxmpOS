use serde::Serialize;
use std::{
    net::TcpStream,
    time::{Duration, Instant},
};

const PROBE_TARGET: &str = "1.1.1.1:443";
const PROBE_COUNT: usize = 5;
const PROBE_TIMEOUT: Duration = Duration::from_millis(750);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkLatencySnapshot {
    target: &'static str,
    samples_ms: Vec<f64>,
    lost_probes: usize,
    total_probes: usize,
    min_ms: Option<f64>,
    median_ms: Option<f64>,
    jitter_ms: Option<f64>,
}

fn measure_latency() -> NetworkLatencySnapshot {
    let target = PROBE_TARGET.parse().expect("static probe address is valid");
    let mut samples_ms = Vec::with_capacity(PROBE_COUNT);
    let mut lost_probes = 0;

    for index in 0..PROBE_COUNT {
        let started = Instant::now();
        match TcpStream::connect_timeout(&target, PROBE_TIMEOUT) {
            Ok(stream) => {
                samples_ms.push((started.elapsed().as_secs_f64() * 1000.0 * 10.0).round() / 10.0);
                drop(stream);
            }
            Err(_) => lost_probes += 1,
        }

        if index + 1 < PROBE_COUNT {
            std::thread::sleep(Duration::from_millis(100));
        }
    }

    let mut sorted = samples_ms.clone();
    sorted.sort_by(f64::total_cmp);
    let median_ms = match sorted.len() {
        0 => None,
        count if count % 2 == 1 => Some(sorted[count / 2]),
        count => Some((sorted[count / 2 - 1] + sorted[count / 2]) / 2.0),
    };
    let jitter_ms = (samples_ms.len() > 1).then(|| {
        let differences = samples_ms.windows(2).map(|pair| (pair[1] - pair[0]).abs());
        let sum: f64 = differences.clone().sum();
        (sum / differences.count() as f64 * 10.0).round() / 10.0
    });

    NetworkLatencySnapshot {
        target: PROBE_TARGET,
        min_ms: sorted.first().copied(),
        median_ms,
        jitter_ms,
        samples_ms,
        lost_probes,
        total_probes: PROBE_COUNT,
    }
}

/// Measures TCP connection setup time to a fixed Cloudflare endpoint; it is not ICMP echo latency.
#[tauri::command]
pub async fn measure_network_latency() -> NetworkLatencySnapshot {
    tauri::async_runtime::spawn_blocking(measure_latency)
        .await
        .unwrap_or_else(|_| NetworkLatencySnapshot {
            target: PROBE_TARGET,
            samples_ms: Vec::new(),
            lost_probes: PROBE_COUNT,
            total_probes: PROBE_COUNT,
            min_ms: None,
            median_ms: None,
            jitter_ms: None,
        })
}
