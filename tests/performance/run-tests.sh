#!/bin/bash
# Performance Test Suite Runner
# Easy English Learning Platform - Phase 17
#
# Usage:
#   ./run-tests.sh [scenario] [test_name]
#
# Examples:
#   ./run-tests.sh smoke all           # Run all tests with smoke scenario
#   ./run-tests.sh stress booking      # Run booking test with stress scenario
#   ./run-tests.sh                     # Interactive mode

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL=${API_BASE_URL:-"http://localhost:3001"}
FRONTEND_URL=${FRONTEND_URL:-"http://localhost:3000"}

# Available scenarios
SCENARIOS=("smoke" "average_load" "stress" "spike" "soak" "peak_bookings")

# Available tests
declare -A TESTS=(
    ["booking"]="booking-load.test.js"
    ["search"]="class-search.test.js"
    ["dashboard"]="dashboard-load.test.js"
    ["gems"]="gem-transaction.test.js"
    ["concurrent"]="concurrent-users.test.js"
    ["conflicts"]="concurrent-bookings.test.js"
)

# Print header
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Easy English - Performance Test Suite${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# Print test info
print_test_info() {
    echo -e "${GREEN}Target API:${NC} $API_BASE_URL"
    echo -e "${GREEN}Frontend:${NC} $FRONTEND_URL"
    echo ""
}

# Check if k6 is installed
check_k6() {
    if ! command -v k6 &> /dev/null; then
        echo -e "${RED}Error: k6 is not installed${NC}"
        echo ""
        echo "Install k6:"
        echo "  macOS:   brew install k6"
        echo "  Windows: choco install k6"
        echo "  Linux:   See https://k6.io/docs/getting-started/installation"
        exit 1
    fi
}

# Check if API is running
check_api() {
    echo -e "${YELLOW}Checking API availability...${NC}"
    if curl -s -f -o /dev/null "$API_BASE_URL/health" 2>/dev/null; then
        echo -e "${GREEN}✓ API is running${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}✗ API is not responding at $API_BASE_URL${NC}"
        echo -e "${YELLOW}Please start the API server before running tests${NC}"
        echo ""
        read -p "Continue anyway? (y/N): " continue
        if [[ ! $continue =~ ^[Yy]$ ]]; then
            exit 1
        fi
        echo ""
    fi
}

# Run a single test
run_test() {
    local test_name=$1
    local test_file=$2
    local scenario=$3

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Running: ${test_name} (${scenario})${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    if [ -f "$test_file" ]; then
        if [ "$scenario" == "default" ]; then
            k6 run "$test_file"
        else
            k6 run -e SCENARIO="$scenario" "$test_file"
        fi

        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}✓ Test passed: $test_name${NC}"
            return 0
        else
            echo ""
            echo -e "${RED}✗ Test failed: $test_name${NC}"
            return 1
        fi
    else
        echo -e "${RED}Error: Test file not found: $test_file${NC}"
        return 1
    fi
}

# Run all tests
run_all_tests() {
    local scenario=$1
    local failed_tests=()

    echo -e "${YELLOW}Running full test suite with scenario: $scenario${NC}"
    echo ""

    for test_name in "${!TESTS[@]}"; do
        test_file="${TESTS[$test_name]}"

        if ! run_test "$test_name" "$test_file" "$scenario"; then
            failed_tests+=("$test_name")
        fi
        echo ""
    done

    # Summary
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  Test Suite Summary${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    total_tests=${#TESTS[@]}
    passed_tests=$((total_tests - ${#failed_tests[@]}))

    echo -e "Total tests:  $total_tests"
    echo -e "${GREEN}Passed:       $passed_tests${NC}"

    if [ ${#failed_tests[@]} -gt 0 ]; then
        echo -e "${RED}Failed:       ${#failed_tests[@]}${NC}"
        echo ""
        echo -e "${RED}Failed tests:${NC}"
        for test in "${failed_tests[@]}"; do
            echo -e "  - $test"
        done
        exit 1
    else
        echo -e "${GREEN}All tests passed!${NC}"
    fi
}

# Interactive mode
interactive_mode() {
    echo "Select scenario:"
    select scenario in "${SCENARIOS[@]}"; do
        if [ -n "$scenario" ]; then
            break
        fi
    done

    echo ""
    echo "Select test to run:"

    # Add "all" option
    local test_options=("all" "${!TESTS[@]}")
    select test_choice in "${test_options[@]}"; do
        if [ -n "$test_choice" ]; then
            if [ "$test_choice" == "all" ]; then
                run_all_tests "$scenario"
            else
                run_test "$test_choice" "${TESTS[$test_choice]}" "$scenario"
            fi
            break
        fi
    done
}

# Main
main() {
    print_header
    check_k6
    print_test_info
    check_api

    # Parse arguments
    if [ $# -eq 0 ]; then
        # No arguments - interactive mode
        interactive_mode
    elif [ $# -eq 2 ]; then
        scenario=$1
        test_name=$2

        # Validate scenario
        if [[ ! " ${SCENARIOS[@]} " =~ " ${scenario} " ]]; then
            echo -e "${RED}Error: Invalid scenario '$scenario'${NC}"
            echo "Valid scenarios: ${SCENARIOS[*]}"
            exit 1
        fi

        # Run tests
        if [ "$test_name" == "all" ]; then
            run_all_tests "$scenario"
        elif [ -n "${TESTS[$test_name]}" ]; then
            run_test "$test_name" "${TESTS[$test_name]}" "$scenario"
        else
            echo -e "${RED}Error: Invalid test name '$test_name'${NC}"
            echo "Valid tests: ${!TESTS[*]}"
            exit 1
        fi
    else
        echo -e "${RED}Error: Invalid arguments${NC}"
        echo ""
        echo "Usage:"
        echo "  $0                    # Interactive mode"
        echo "  $0 [scenario] [test]  # Run specific test"
        echo ""
        echo "Examples:"
        echo "  $0 smoke all          # Run all tests with smoke scenario"
        echo "  $0 stress booking     # Run booking test with stress scenario"
        echo ""
        echo "Scenarios: ${SCENARIOS[*]}"
        echo "Tests: ${!TESTS[*]} all"
        exit 1
    fi
}

# Run main
main "$@"
